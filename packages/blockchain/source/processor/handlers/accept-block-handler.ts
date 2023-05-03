import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { DatabaseInteraction } from "@mainsail/core-state";

import { BlockHandler, BlockProcessorResult } from "../contracts";
import { RevertBlockHandler } from "./revert-block-handler";

@injectable()
export class AcceptBlockHandler implements BlockHandler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	protected readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.DatabaseInteraction)
	private readonly databaseInteraction!: DatabaseInteraction;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	public async execute(block: Contracts.Crypto.IBlock): Promise<BlockProcessorResult> {
		try {
			await this.databaseInteraction.applyBlock(block);

			// Check if we recovered from a fork
			const forkedBlock = this.state.getForkedBlock();
			if (forkedBlock && forkedBlock.data.height === block.data.height) {
				this.logger.info("Successfully recovered from fork");
				this.state.clearForkedBlock();
			}

			for (const transaction of block.transactions) {
				await this.transactionPool.removeForgedTransaction(transaction);
			}

			// Reset wake-up timer after chaining a block, since there's no need to
			// wake up at all if blocks arrive periodically. Only wake up when there are
			// no new blocks.

			if (this.state.isStarted()) {
				this.blockchain.resetWakeUp();
			}

			// Ensure the lastDownloadedBlock is never behind the last accepted block.
			const lastDownloadedBock = this.state.getLastDownloadedBlock();
			if (lastDownloadedBock && lastDownloadedBock.height < block.data.height) {
				this.state.setLastDownloadedBlock(block.data);
			}

			return BlockProcessorResult.Accepted;
		} catch (error) {
			this.logger.warning(`Refused new block ${JSON.stringify(block.data)}`);
			this.logger.debug(error.stack);

			this.blockchain.resetLastDownloadedBlock();

			// Revert block if accepted
			if (this.state.getLastBlock().data.height === block.data.height) {
				const revertResult = await this.app.resolve<RevertBlockHandler>(RevertBlockHandler).execute(block);

				if (revertResult === BlockProcessorResult.Corrupted) {
					return revertResult;
				}
			}

			return BlockProcessorResult.Rejected;
		}
	}
}

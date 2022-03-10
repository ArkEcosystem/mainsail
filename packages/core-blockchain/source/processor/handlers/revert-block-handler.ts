import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { DatabaseInteraction } from "@arkecosystem/core-state";

import { BlockHandler, BlockProcessorResult } from "../contracts";

@injectable()
export class RevertBlockHandler implements BlockHandler {
	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	@inject(Identifiers.DatabaseInteraction)
	private readonly databaseInteraction!: DatabaseInteraction;

	@inject(Identifiers.Database.Service)
	private readonly database: Contracts.Database.IDatabaseService;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	public async execute(block: Contracts.Crypto.IBlock): Promise<BlockProcessorResult> {
		try {
			await this.databaseInteraction.revertBlock(block);

			for (const transaction of block.transactions) {
				await this.transactionPool.addTransaction(transaction);
			}

			// Remove last block, take from DB if list is empty
			let previousBlock: Contracts.Crypto.IBlock | undefined = this.state
				.getLastBlocks()
				.find((stateBlock) => stateBlock.data.height === block.data.height - 1);

			if (!previousBlock) {
				previousBlock = await this.database.getLastBlock();
			}

			if (previousBlock.data.height + 1 !== block.data.height) {
				throw new Error(
					`Previous block height is invalid. Found block with height ${previousBlock.data.height} instead ${
						block.data.height - 1
					}`,
				);
			}

			this.state.setLastBlock(previousBlock);

			return BlockProcessorResult.Reverted;
		} catch (error) {
			this.logger.error(
				`Critical error occurs when reverting block at height ${block.data.height.toLocaleString()}. Possible state corruption. Message: ${
					error.message
				}`,
			);

			return BlockProcessorResult.Corrupted;
		}
	}
}

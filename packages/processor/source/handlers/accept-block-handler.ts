import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class AcceptBlockHandler implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainService)
	protected readonly blockchain!: Contracts.Blockchain.Blockchain;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	// @inject(Identifiers.DatabaseInteraction)
	// private readonly databaseInteraction!: DatabaseInteraction;

	@inject(Identifiers.TransactionPoolService)
	private readonly transactionPool!: Contracts.TransactionPool.Service;

	public async execute(roundState: Contracts.Consensus.IRoundState): Promise<boolean> {
		const block = roundState.getProposal().toData().block;

		try {
			// await this.databaseInteraction.applyBlock(block);

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

			return true;
		} catch (error) {
			this.logger.warning(`Refused new block ${JSON.stringify(block.data)}`);
			this.logger.debug(error.stack);

			this.blockchain.resetLastDownloadedBlock();

			return false;
		}
	}
}

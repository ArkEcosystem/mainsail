import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommitHandler {
	@inject(Identifiers.State.Service)
	protected readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionPool.Query)
	private readonly transactionPoolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.Cryptography.Block.Factory)
	private readonly blockFactory!: Contracts.Crypto.BlockFactory;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async handle(
		parameters: Contracts.TransactionPool.Actions.CommitRequest,
	): Promise<Contracts.TransactionPool.Actions.CommitResponse> {
		try {
			const store = this.stateService.createStoreClone();

			store.applyChanges(parameters.store);
			store.commitChanges();

			this.configuration.setHeight(store.getLastHeight() + 1);

			const block = await this.blockFactory.fromHex(parameters.block);
			store.setLastBlock(block);

			for (const transaction of block.transactions) {
				await this.transactionPoolService.removeForgedTransaction(transaction);
			}

			for (const transactionId of parameters.failedTransactions) {
				try {
					const transaction = await this.transactionPoolQuery.getAll().whereId(transactionId).first();
					await this.transactionPoolService.removeTransaction(transaction);
				} catch {}
			}

			await this.stateService.export(block.data.height);

			this.logger.info(
				`Block ${block.data.height.toLocaleString()} with ${block.data.numberOfTransactions.toLocaleString()} tx(s) committed.`,
			);
		} catch (error) {
			this.logger.error(`Failed to commit block: ${error.message}`);

			throw new Error(`Cannot process changes, because: ${error.message}`);
		}

		return true;
	}
}

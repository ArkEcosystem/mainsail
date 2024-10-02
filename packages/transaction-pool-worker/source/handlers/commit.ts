import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class CommitHandler {
	@inject(Identifiers.State.Store)
	protected readonly stateStore!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	@inject(Identifiers.Cryptography.Transaction.Factory)
	private readonly transactionFactory!: Contracts.Crypto.TransactionFactory;

	@inject(Identifiers.Services.Log.Service)
	protected readonly logger!: Contracts.Kernel.Logger;

	public async handle(height: number, transactions: {transaction: string, gasUsed: number}[], failedTransactions: string[] ): Promise<void> {
		try {

			this.stateStore.setHeight(height);
			this.configuration.setHeight(height + 1);

			await this.transactionPoolService.commit(await Promise.all(transactions.map(async (data) => ({
					gasUsed: data.gasUsed,
					transaction: await this.transactionFactory.fromHex(data.transaction),
				}))), failedTransactions);

			if (this.configuration.isNewMilestone()) {
				void this.transactionPoolService.reAddTransactions();
			}
		} catch (error) {
			throw new Error(`Failed to commit block: ${error.message}`);
		}
	}
}

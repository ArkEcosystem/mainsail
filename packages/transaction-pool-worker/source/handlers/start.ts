import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class StartHandler {
	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	public async handle(): Promise<void> {
		await this.transactionPoolService.reAddTransactions();
	}
}

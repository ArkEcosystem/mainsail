import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class StartHandler {
	@inject(Identifiers.State.Store)
	protected readonly store!: Contracts.State.Store;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	public async handle(height: number): Promise<void> {
		this.store.setHeight(height);

		await this.transactionPoolService.reAddTransactions();
	}
}

import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class RemoveTransactionHandler {
	@inject(Identifiers.TransactionPool.Mempool)
	private readonly mempool!: Contracts.TransactionPool.Mempool;

	@inject(Identifiers.TransactionPool.Storage)
	private readonly storage!: Contracts.TransactionPool.Storage;

	public async handle(address: string, id: string): Promise<void> {
		await this.mempool.removeTransaction(address, id);
		this.storage.removeTransaction(id);
	}
}

import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Handlers } from "@mainsail/transaction-pool-worker";

@injectable()
export class PoolWorker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionPool.Query)
	private readonly transactionPoolQuery!: Contracts.TransactionPool.Query;

	#failedTransactions: Contracts.Crypto.Transaction[] = [];

	public async boot(flags: Contracts.TransactionPool.WorkerFlags): Promise<void> {}

	public async kill(): Promise<number> {
		return 0;
	}
	public getQueueSize(): number {
		return 0;
	}
	public setFailedTransactions(transactions: Contracts.Crypto.Transaction[]): void {
		this.#failedTransactions = [...this.#failedTransactions, ...transactions];
	}
	async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();
		for (const transaction of block.transactions) {
			await this.transactionPoolService.removeForgedTransaction(transaction);
		}
		for (const transactionId of this.#failedTransactions.map((transaction) => transaction.id)) {
			try {
				const transaction = await this.transactionPoolQuery.getAll().whereId(transactionId).first();
				await this.transactionPoolService.removeTransaction(transaction);
			} catch {}
		}
		this.#failedTransactions = [];
	}
	public async importSnapshot(height: number): Promise<void> {}

	public async getTransactionBytes(): Promise<Buffer[]> {
		const response: string[] = await this.app.resolve(Handlers.GetTransactionsHandler).handle();
		return response.map((transaction: string) => Buffer.from(transaction, "hex"));
	}
}

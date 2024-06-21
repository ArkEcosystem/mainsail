import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { GetTransactionsHandler } from "@mainsail/transaction-pool-worker/distribution/handlers/index.js";

@injectable()
export class PoolWorker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.TransactionPool.Mempool)
	private readonly transactionPoolMempool!: Contracts.TransactionPool.Mempool;

	@inject(Identifiers.TransactionPool.Query)
	private readonly transactionPoolQuery!: Contracts.TransactionPool.Query;

	#failedTransactions: Contracts.Crypto.Transaction[] = [];

	public async boot(flags: Contracts.TransactionPool.WorkerFlags): Promise<void> {}

	public async start(): Promise<void> {}

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
			await this.transactionPoolMempool.removeForgedTransaction(transaction.data.senderPublicKey, transaction.id);
		}
		for (const transactionId of this.#failedTransactions.map((transaction) => transaction.id)) {
			try {
				const transaction = await this.transactionPoolQuery.getAll().whereId(transactionId).first();
				await this.transactionPoolMempool.removeTransaction(transaction.data.senderPublicKey, transaction.id);
			} catch {}
		}

		await this.transactionPoolMempool.fixInvalidStates();
		this.#failedTransactions = [];
	}
	public async importSnapshot(height: number): Promise<void> {}

	public async getTransactionBytes(): Promise<Buffer[]> {
		const response: string[] = await this.app.resolve(GetTransactionsHandler).handle();
		return response.map((transaction: string) => Buffer.from(transaction, "hex"));
	}

	registerEventHandler(event: string, callback: Contracts.Kernel.IPC.EventCallback<any>): void {}

	async setPeer(ip: string): Promise<void> {}
	async forgetPeer(ip: string): Promise<void> {}
}

import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class PoolWorker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.TransactionPool.Query)
	private readonly poolQuery!: Contracts.TransactionPool.Query;

	@inject(Identifiers.TransactionPool.Mempool)
	private readonly transactionPoolMempool!: Contracts.TransactionPool.Mempool;

	public async boot(flags: Contracts.TransactionPool.WorkerFlags): Promise<void> {}

	public async handle(): Promise<void> {}

	public async start(): Promise<void> {}

	public async kill(): Promise<number> {
		return 0;
	}
	public getQueueSize(): number {
		return 0;
	}
	async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const sendersAddresses: Set<string> = new Set();

		for (const transaction of unit.getBlock().transactions) {
			sendersAddresses.add(transaction.from);
		}

		await this.transactionPoolMempool.reAddTransactions([...sendersAddresses.keys()]);
	}

	public async getTransactions(options: Contracts.TransactionPool.GetBatchOptions): Promise<Contracts.TransactionPool.GetBatchResult> {
		return {
			remaining: 0,
			transactions: (await this.poolQuery.getFromHighestPriority().all()).map((transaction) => transaction.toData()),
		}
	}

	public async removeTransaction(address: string, hash: string): Promise<void> {
		await this.transactionPoolMempool.removeTransaction(address, hash);
	}

	registerEventHandler(event: string, callback: Contracts.Kernel.IPC.EventCallback<any>): void {}

	async setPeer(ip: string): Promise<void> {}
	async forgetPeer(ip: string): Promise<void> {}
	async reloadWebhooks(): Promise<void> {}
}

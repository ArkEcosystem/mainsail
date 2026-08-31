import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

@injectable()
export class PoolWorker implements Contracts.TransactionPool.Worker {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.TransactionPool.Selector)
	private readonly selector!: Contracts.TransactionPool.Selector;

	@inject(Identifiers.TransactionPool.Service)
	private readonly transactionPoolService!: Contracts.TransactionPool.Service;

	@inject(Identifiers.TransactionPool.Mempool)
	private readonly transactionPoolMempool!: Contracts.TransactionPool.Mempool;

	public async boot(flags: Contracts.TransactionPool.WorkerFlags): Promise<void> {}

	public async handle(): Promise<void> {}

	public async start(): Promise<void> {}

	public async kill(): Promise<number> {
		return 0;
	}

	public async dispose(): Promise<void> {}

	public getQueueSize(): number {
		return 0;
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		const sendersAddresses = new Set<string>();
		for (const transaction of block.transactions) {
			sendersAddresses.add(transaction.from);
		}

		const { blockTime } = this.configuration.getMilestone().timeouts;
		const isSyncing = block.timestamp < Date.now() - blockTime * 3;

		// Discard the batch snapshot so the next round re-reads the pool.
		this.selector.clear();

		if (this.configuration.isNewMilestone()) {
			await this.transactionPoolService.reAddTransactions();
		} else {
			await this.transactionPoolService.commit([...sendersAddresses], block.gasUsed, isSyncing);
		}
	}

	public async getTransactions(
		options: Contracts.TransactionPool.GetBatchOptions,
	): Promise<Contracts.TransactionPool.GetBatchResult> {
		return this.selector.getBatch(options);
	}

	public async removeTransaction(address: string, hash: string): Promise<void> {
		await this.transactionPoolMempool.removeTransaction(address, hash);
	}

	public registerEventHandler<T>(event: string, callback: Contracts.Kernel.IPC.EventCallback<T>): void {}

	public async setPeer(ip: string): Promise<void> {}
	public async forgetPeer(ip: string): Promise<void> {}
	public async reloadWebhooks(): Promise<void> {}
}

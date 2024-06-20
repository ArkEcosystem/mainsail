import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class Mempool implements Contracts.TransactionPool.Mempool {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPool.SenderMempool.Factory)
	private readonly createSenderMempool!: Contracts.TransactionPool.SenderMempoolFactory;

	@inject(Identifiers.Cryptography.Identity.Address.Factory)
	@tagged("type", "wallet")
	private readonly addressFactory!: Contracts.Crypto.AddressFactory;

	readonly #senderMempools = new Map<string, Contracts.TransactionPool.SenderMempool>();
	readonly #brokenSenders = new Set<string>();

	public getSize(): number {
		return [...this.#senderMempools.values()].reduce((sum, p) => sum + p.getSize(), 0);
	}

	public hasSenderMempool(senderPublicKey: string): boolean {
		return this.#senderMempools.has(senderPublicKey);
	}

	public getSenderMempool(senderPublicKey: string): Contracts.TransactionPool.SenderMempool {
		const senderMempool = this.#senderMempools.get(senderPublicKey);
		if (!senderMempool) {
			throw new Error("Unknown sender");
		}
		return senderMempool;
	}

	public getSenderMempools(): Iterable<Contracts.TransactionPool.SenderMempool> {
		return this.#senderMempools.values();
	}

	public async fixInvalidStates(): Promise<Contracts.Crypto.Transaction[]> {
		const removedTransactions: Contracts.Crypto.Transaction[] = [];

		for (const senderPublicKey of this.#brokenSenders) {
			const transactionsForReadd = [...this.getSenderMempool(senderPublicKey).getFromEarliest()];

			const newSenderMempool = await this.createSenderMempool.call(this, senderPublicKey);

			for (let i = 0; i < transactionsForReadd.length; i++) {
				const transaction = transactionsForReadd[i];

				try {
					await newSenderMempool.addTransaction(transaction);
				} catch {
					transactionsForReadd.slice(i).map((tx) => {
						removedTransactions.push(tx);
					});
					break;
				}
			}

			this.#senderMempools.delete(senderPublicKey);
			if (newSenderMempool.getSize()) {
				this.#senderMempools.set(senderPublicKey, newSenderMempool);
			}
		}

		this.#brokenSenders.clear();
		return removedTransactions;
	}

	public async addTransaction(transaction: Contracts.Crypto.Transaction): Promise<void> {
		let senderMempool = this.#senderMempools.get(transaction.data.senderPublicKey);
		if (!senderMempool) {
			senderMempool = await this.createSenderMempool.call(this, transaction.data.senderPublicKey);
			this.#senderMempools.set(transaction.data.senderPublicKey, senderMempool);
			this.logger.debug(
				`${await this.addressFactory.fromPublicKey(transaction.data.senderPublicKey)} state created`,
			);
		}

		try {
			await senderMempool.addTransaction(transaction);
		} finally {
			await this.#removeDisposableMempool(transaction.data.senderPublicKey);
		}
	}

	public async removeTransaction(senderPublicKey: string, id: string): Promise<Contracts.Crypto.Transaction[]> {
		const senderMempool = this.#senderMempools.get(senderPublicKey);
		if (!senderMempool) {
			return [];
		}

		const transactions = senderMempool.removeTransaction(id);

		if (transactions.length > 0 && !(await this.#removeDisposableMempool(senderPublicKey))) {
			this.#brokenSenders.add(senderPublicKey);
		}

		return transactions;
	}

	public async removeForgedTransaction(senderPublicKey: string, id: string): Promise<Contracts.Crypto.Transaction[]> {
		const senderMempool = this.#senderMempools.get(senderPublicKey);
		if (!senderMempool) {
			return [];
		}

		const transaction = senderMempool.removeForgedTransaction(id);

		if (!transaction) {
			this.#brokenSenders.add(senderPublicKey);
			return [];
		}

		await this.#removeDisposableMempool(senderPublicKey);

		return [transaction];
	}

	public flush(): void {
		this.#senderMempools.clear();
	}

	async #removeDisposableMempool(senderPublicKey: string): Promise<boolean> {
		const senderMempool = this.#senderMempools.get(senderPublicKey);

		if (senderMempool && senderMempool.isDisposable()) {
			this.#senderMempools.delete(senderPublicKey);
			this.logger.debug(`${await this.addressFactory.fromPublicKey(senderPublicKey)} state disposed`);

			return true;
		}

		return false;
	}
}

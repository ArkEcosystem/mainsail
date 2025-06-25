import { inject, injectable } from "@mainsail/container";
import { Contracts, Events, Identifiers } from "@mainsail/contracts";

@injectable()
export class Mempool implements Contracts.TransactionPool.Mempool {
	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	@inject(Identifiers.TransactionPool.SenderMempool.Factory)
	private readonly createSenderMempool!: Contracts.TransactionPool.SenderMempoolFactory;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.TransactionPool.Storage)
	private readonly storage!: Contracts.TransactionPool.Storage;

	readonly #senderMempools = new Map<string, Contracts.TransactionPool.SenderMempool>();

	public getSize(): number {
		return [...this.#senderMempools.values()].reduce((sum, p) => sum + p.getSize(), 0);
	}

	public hasSenderMempool(address: string): boolean {
		return this.#senderMempools.has(address);
	}

	public getSenderMempool(address: string): Contracts.TransactionPool.SenderMempool {
		const senderMempool = this.#senderMempools.get(address);
		if (!senderMempool) {
			throw new Error("Unknown sender");
		}
		return senderMempool;
	}

	public getSenderMempools(): Iterable<Contracts.TransactionPool.SenderMempool> {
		return this.#senderMempools.values();
	}

	public async addTransaction(transaction: Contracts.Crypto.Transaction): Promise<void> {
		const { from, senderLegacyAddress } = transaction.data;

		let senderMempool = this.#senderMempools.get(from);
		if (!senderMempool) {
			senderMempool = await this.createSenderMempool.call(this, from, senderLegacyAddress);
			this.#senderMempools.set(from, senderMempool);
			this.logger.debug(`${from} state created`);
		}

		try {
			// When receiving a nonce less than or equal to the current nonce try to replace it.
			if (transaction.data.nonce.isLessThanEqual(senderMempool.getNonce())) {
				await this.#tryReplaceTransaction(transaction, senderMempool);
			} else {
				await senderMempool.addTransaction(transaction);
			}
		} finally {
			this.#removeDisposableMempool(from);
		}
	}

	public async removeTransaction(address: string, hash: string): Promise<Contracts.Crypto.Transaction[]> {
		const senderMempool = this.#senderMempools.get(address);
		if (!senderMempool) {
			return [];
		}

		const transactions = senderMempool.removeTransaction(hash);
		this.#removeDisposableMempool(address);

		return transactions;
	}

	public async reAddTransactions(addresses: string[]): Promise<Contracts.Crypto.Transaction[]> {
		const removedTransactions: Contracts.Crypto.Transaction[] = [];

		for (const address of addresses) {
			const senderMempool = this.#senderMempools.get(address);
			if (!senderMempool) {
				continue;
			}

			removedTransactions.push(...(await senderMempool.reAddTransactions()));
		}

		return removedTransactions;
	}

	async #tryReplaceTransaction(
		transaction: Contracts.Crypto.Transaction,
		senderMempool: Contracts.TransactionPool.SenderMempool,
	): Promise<void> {
		const removedTransactions = await senderMempool.replaceTransaction(transaction);

		// If no replacement happened, handle the transaction as usual to get a consistent behavior instead
		// of failing silently.
		if (removedTransactions.length === 0) {
			return senderMempool.addTransaction(transaction);
		}

		for (const removed of removedTransactions) {
			this.storage.removeTransaction(removed.hash);
			this.logger.debug(`Removed overwritten tx ${removed.hash}`);
			void this.events.dispatch(Events.TransactionEvent.RemovedFromPool, removed.data);
		}
	}

	public flush(): void {
		this.#senderMempools.clear();
	}

	#removeDisposableMempool(address: string): boolean {
		const senderMempool = this.#senderMempools.get(address);

		if (senderMempool && senderMempool.isDisposable()) {
			this.#senderMempools.delete(address);
			this.logger.debug(`${address} state disposed`);

			return true;
		}

		return false;
	}
}

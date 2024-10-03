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

	public async fixInvalidStates(): Promise<Contracts.Crypto.Transaction[]> {
		const removedTransactions: Contracts.Crypto.Transaction[] = [];

		for (const address of this.#brokenSenders) {
			const transactionsForReadd = [...this.getSenderMempool(address).getFromEarliest()];

			const newSenderMempool = await this.createSenderMempool.call(this, address);

			for (let index = 0; index < transactionsForReadd.length; index++) {
				const transaction = transactionsForReadd[index];

				try {
					await newSenderMempool.addTransaction(transaction);
				} catch {
					transactionsForReadd.slice(index).map((tx) => {
						removedTransactions.push(tx);
					});
					break;
				}
			}

			this.#senderMempools.delete(address);
			if (newSenderMempool.getSize()) {
				this.#senderMempools.set(address, newSenderMempool);
			}
		}

		this.#brokenSenders.clear();
		return removedTransactions;
	}

	public async addTransaction(transaction: Contracts.Crypto.Transaction): Promise<void> {
		const address = await this.addressFactory.fromPublicKey(transaction.data.senderPublicKey);

		let senderMempool = this.#senderMempools.get(address);
		if (!senderMempool) {
			senderMempool = await this.createSenderMempool.call(this, address);
			this.#senderMempools.set(address, senderMempool);
			this.logger.debug(`${address} state created`);
		}

		try {
			await senderMempool.addTransaction(transaction);
		} finally {
			await this.#removeDisposableMempool(address);
		}
	}

	public async removeTransaction(address: string, id: string): Promise<Contracts.Crypto.Transaction[]> {
		const senderMempool = this.#senderMempools.get(address);
		if (!senderMempool) {
			return [];
		}

		const transactions = senderMempool.removeTransaction(id);

		if (transactions.length > 0 && !(await this.#removeDisposableMempool(address))) {
			this.#brokenSenders.add(address);
		}

		return transactions;
	}

	public async reAddTransactions(addresses: string[]): Promise<Contracts.Crypto.Transaction[]> {
		const removedTransactions: Contracts.Crypto.Transaction[] = [];

		for (const address of addresses) {
			const senderMempool = this.#senderMempools.get(address);
			if (!senderMempool) {
				continue;
			}

			removedTransactions.push(...await senderMempool.reAddTransactions());
		}

		return removedTransactions;
	}

	public flush(): void {
		this.#senderMempools.clear();
	}

	async #removeDisposableMempool(address: string): Promise<boolean> {
		const senderMempool = this.#senderMempools.get(address);

		if (senderMempool && senderMempool.isDisposable()) {
			this.#senderMempools.delete(address);
			this.logger.debug(`${address} state disposed`);

			return true;
		}

		return false;
	}
}

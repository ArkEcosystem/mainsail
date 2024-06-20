import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Providers, Utils as AppUtils } from "@mainsail/kernel";

@injectable()
export class SenderMempool implements Contracts.TransactionPool.SenderMempool {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-service")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.TransactionPool.SenderState)
	private readonly senderState!: Contracts.TransactionPool.SenderState;

	#concurrency = 0;

	readonly #lock: AppUtils.Lock = new AppUtils.Lock();

	readonly #transactions: Contracts.Crypto.Transaction[] = [];

	public async configure(publicKey: string): Promise<SenderMempool> {
		await this.senderState.configure(publicKey);
		return this;
	}

	public isDisposable(): boolean {
		return this.#transactions.length === 0 && this.#concurrency === 0;
	}

	public getSize(): number {
		return this.#transactions.length;
	}

	public getFromEarliest(): Iterable<Contracts.Crypto.Transaction> {
		return [...this.#transactions];
	}

	public getFromLatest(): Iterable<Contracts.Crypto.Transaction> {
		return [...this.#transactions].reverse();
	}

	public async addTransaction(transaction: Contracts.Crypto.Transaction): Promise<void> {
		try {
			this.#concurrency++;

			await this.#lock.runExclusive(async () => {
				AppUtils.assert.defined<string>(transaction.data.senderPublicKey);

				const maxTransactionsPerSender: number =
					this.configuration.getRequired<number>("maxTransactionsPerSender");
				if (this.#transactions.length >= maxTransactionsPerSender) {
					const allowedSenders: string[] = this.configuration.getOptional<string[]>("allowedSenders", []);
					if (!allowedSenders.includes(transaction.data.senderPublicKey)) {
						throw new Exceptions.SenderExceededMaximumTransactionCountError(
							transaction,
							maxTransactionsPerSender,
						);
					}
				}

				await this.senderState.apply(transaction);
				this.#transactions.push(transaction);
			});
		} finally {
			this.#concurrency--;
		}
	}

	public async removeTransaction(id: string): Promise<Contracts.Crypto.Transaction[]> {
		try {
			this.#concurrency++;
			const index = this.#transactions.findIndex((t) => t.id === id);
			if (index === -1) {
				return [];
			}
			return this.#transactions.splice(index, this.#transactions.length - index).reverse();
		} finally {
			this.#concurrency--;
		}
	}

	public async removeForgedTransaction(id: string): Promise<boolean> {
		try {
			this.#concurrency++;

			if (this.#transactions.length === 0) {
				throw new Error("No transactions in sender mempool");
			}

			if (this.#transactions[0].id === id) {
				this.#transactions.shift();
				return true;
			}

			return false;
		} finally {
			this.#concurrency--;
		}
	}
}

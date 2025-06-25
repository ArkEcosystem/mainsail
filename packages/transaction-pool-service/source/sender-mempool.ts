import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { assert, BigNumber, Lock } from "@mainsail/utils";

@injectable()
export class SenderMempool implements Contracts.TransactionPool.SenderMempool {
	@inject(Identifiers.ServiceProvider.Configuration)
	@tagged("plugin", "transaction-pool-service")
	private readonly configuration!: Providers.PluginConfiguration;

	@inject(Identifiers.TransactionPool.SenderState)
	private readonly senderState!: Contracts.TransactionPool.SenderState;

	#concurrency = 0;

	readonly #lock = new Lock();

	readonly #transactions: Contracts.Crypto.Transaction[] = [];

	public async configure(address: string, legacyAddress?: string): Promise<SenderMempool> {
		await this.senderState.configure(address, legacyAddress);
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

	public getNonce(): BigNumber {
		return this.senderState.getNonce();
	}

	public async addTransaction(transaction: Contracts.Crypto.Transaction): Promise<void> {
		try {
			this.#concurrency++;

			await this.#lock.runExclusive(async () => {
				const maxTransactionsPerSender: number =
					this.configuration.getRequired<number>("maxTransactionsPerSender");
				if (this.#transactions.length >= maxTransactionsPerSender) {
					const allowedSenders: string[] = this.configuration.getOptional<string[]>("allowedSenders", []);
					if (!allowedSenders.includes(transaction.data.from)) {
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

	public removeTransaction(hash: string): Contracts.Crypto.Transaction[] {
		const index = this.#transactions.findIndex((t) => t.hash === hash);
		if (index === -1) {
			return [];
		}
		const transactions = this.#transactions.splice(index, this.#transactions.length - index).reverse();

		for (const transaction of transactions) {
			this.senderState.revert(transaction);
		}

		return transactions;
	}

	public async replaceTransaction(
		newTransaction: Contracts.Crypto.Transaction,
	): Promise<Contracts.Crypto.Transaction[]> {
		// Collect all transactions at a higher or equal nonce
		const affectedTransactions: Contracts.Crypto.Transaction[] = [];
		for (const existingTransaction of this.getFromLatest()) {
			if (existingTransaction.data.nonce.isLessThan(newTransaction.data.nonce)) {
				break;
			}

			affectedTransactions.push(existingTransaction);
		}

		if (affectedTransactions.length === 0) {
			return [];
		}

		// Check if the transaction can be replaced
		const sameNonceTransaction = affectedTransactions.at(-1);
		assert.defined(sameNonceTransaction);

		if (!sameNonceTransaction.data.nonce.isEqualTo(newTransaction.data.nonce)) {
			throw new Error("transaction nonce mismatch");
		}

		const newGasPrice = newTransaction.data.gasPrice;
		const currentGasPrice = sameNonceTransaction.data.gasPrice;

		// Do nothing if gas price is not higher
		if (newGasPrice <= currentGasPrice) {
			return [];
		}

		// Try to replace the same nonce transaction.
		// If it succeeds, we can keep all higher transactions currently in the pool.
		// Otherwise, all higher transactions must re-added.
		const index = this.#transactions.findIndex((tx) => tx.data.nonce.isEqualTo(newTransaction.data.nonce));
		if (await this.senderState.replace(sameNonceTransaction, newTransaction, this.senderState.getNonce())) {
			if (!sameNonceTransaction.data.nonce.isEqualTo(this.#transactions[index].data.nonce)) {
				throw new Error("expected same transaction nonce");
			}

			this.#transactions[index] = newTransaction;
			return [sameNonceTransaction];
		}

		// Revert in high-to-low order and then re-add
		const transactions = this.#transactions.splice(index, this.#transactions.length - index).reverse();
		for (const transaction of transactions) {
			this.senderState.revert(transaction);
		}

		// Replace same nonce transaction
		transactions.reverse();
		if (!transactions[0].data.nonce.isEqualTo(newTransaction.data.nonce)) {
			throw new Error("expected to replace same transaction nonce");
		}

		transactions[0] = newTransaction;
		const removedTransactions: Contracts.Crypto.Transaction[] = [sameNonceTransaction];

		// Apply new and all following transactions
		for (const transaction of transactions) {
			try {
				await this.addTransaction(transaction);
			} catch (ex) {
				removedTransactions.push(transaction);
			}
		}

		return removedTransactions;
	}

	public async reAddTransactions(): Promise<Contracts.Crypto.Transaction[]> {
		await this.senderState.reset();

		const removedTransactions: Contracts.Crypto.Transaction[] = [];

		const transactions = this.#transactions.splice(0, this.#transactions.length);
		for (const transaction of transactions) {
			try {
				await this.addTransaction(transaction);
			} catch {
				removedTransactions.push(transaction);
			}
		}

		return removedTransactions;
	}
}

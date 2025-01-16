import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

type SortFunction = (a: Contracts.Crypto.Transaction, b: Contracts.Crypto.Transaction) => number;
type SenderMempoolSelectorFunction = (
	mempool: Contracts.TransactionPool.SenderMempool,
) => Contracts.Crypto.Transaction[];

const sortByHighestGasPrice = (a: Contracts.Crypto.Transaction, b: Contracts.Crypto.Transaction) =>
	b.data.gasPrice - a.data.gasPrice;

const sortByLowestGasPrice = (a: Contracts.Crypto.Transaction, b: Contracts.Crypto.Transaction) =>
	a.data.gasPrice - b.data.gasPrice;

export class QueryIterable implements Contracts.TransactionPool.QueryIterable {
	public transactions: Contracts.Crypto.Transaction[];
	public predicates: Contracts.TransactionPool.QueryPredicate[] = [];

	public constructor(
		transactions: Contracts.Crypto.Transaction[],
		predicate?: Contracts.TransactionPool.QueryPredicate,
	) {
		this.transactions = transactions;

		if (predicate) {
			this.predicates.push(predicate);
		}
	}

	public async all(): Promise<Contracts.Crypto.Transaction[]> {
		const transactions: Contracts.Crypto.Transaction[] = [];

		for (const transaction of this.transactions) {
			if (await this.#satisfiesPredicates(transaction)) {
				transactions.push(transaction);
			}
		}

		return transactions;
	}

	public async first(): Promise<Contracts.Crypto.Transaction> {
		for (const transaction of await this.all()) {
			return transaction;
		}

		throw new Error("Transaction not found");
	}

	public async has(): Promise<boolean> {
		return (await this.all()).length > 0;
	}

	public wherePredicate(predicate: Contracts.TransactionPool.QueryPredicate): QueryIterable {
		this.predicates.push(predicate);

		return this;
	}

	public whereId(id: string): QueryIterable {
		return this.wherePredicate(async (t) => t.id === id);
	}

	async #satisfiesPredicates(transaction: Contracts.Crypto.Transaction): Promise<boolean> {
		if (this.predicates.length === 0) {
			return true;
		}

		for (const predicate of this.predicates) {
			if (!(await predicate(transaction))) {
				return false;
			}
		}

		return true;
	}
}

@injectable()
export class Query implements Contracts.TransactionPool.Query {
	@inject(Identifiers.TransactionPool.Mempool)
	private readonly mempool!: Contracts.TransactionPool.Mempool;

	public getAll(): QueryIterable {
		return new QueryIterable(
			[...this.mempool.getSenderMempools()].flatMap((senderMempool) => [...senderMempool.getFromLatest()]),
		);
	}

	public getAllBySender(senderPublicKey: string): QueryIterable {
		if (!this.mempool.hasSenderMempool(senderPublicKey)) {
			return new QueryIterable([]);
		}

		return new QueryIterable([...this.mempool.getSenderMempool(senderPublicKey).getFromEarliest()]);
	}

	public getFromLowestPriority(): QueryIterable {
		return this.#getTransactions((senderMempool) => [...senderMempool.getFromLatest()], sortByLowestGasPrice);
	}

	public getFromHighestPriority(): QueryIterable {
		return this.#getTransactions((senderMempool) => [...senderMempool.getFromEarliest()], sortByHighestGasPrice);
	}

	#getTransactions(selector: SenderMempoolSelectorFunction, prioritySort: SortFunction): QueryIterable {
		// Group transactions by sender mempool
		const transactionsBySenderMempool: Record<string, Contracts.Crypto.Transaction[]> = {};
		for (const senderMempool of this.mempool.getSenderMempools()) {
			const transactions = selector(senderMempool);
			if (transactions.length === 0) {
				continue;
			}

			transactionsBySenderMempool[transactions[0].data.senderAddress] = transactions;
		}

		// Add first transaction of each sender mempool
		const priorityQueue: Contracts.Crypto.Transaction[] = [];
		for (const transactions of Object.values(transactionsBySenderMempool)) {
			priorityQueue.push(transactions[0]);
		}

		// Sort by priority (nonces are per sender and already handled by the provided selector)
		priorityQueue.sort(prioritySort);

		// Lastly, select transactions from priority queue until all sender mempools are empty.
		const selectedTransactions: Contracts.Crypto.Transaction[] = [];
		while (priorityQueue.length > 0) {
			// Pick next priority transaction
			const transaction = priorityQueue.shift();
			Utils.assert.defined(transaction);
			selectedTransactions.push(transaction);

			// Remove the selected transaction from sender mempool
			const senderMempool = transactionsBySenderMempool[transaction.data.senderAddress];
			senderMempool.shift();

			// If the sender has more transactions, add the next one to the queue
			if (senderMempool.length > 0) {
				priorityQueue.push(senderMempool[0]);
			}

			// Re-sort the priority queue
			priorityQueue.sort(prioritySort);
		}

		return new QueryIterable(selectedTransactions);
	}
}

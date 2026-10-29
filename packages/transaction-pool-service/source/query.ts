import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { Heap } from "heap-js";

type SortFunction = (a: Contracts.Crypto.Transaction, b: Contracts.Crypto.Transaction) => number;
type SenderMempoolSelectorFunction = (
	mempool: Contracts.TransactionPool.SenderMempool,
) => Contracts.Crypto.Transaction[];

const sortByHighestGasPrice = (a: Contracts.Crypto.Transaction, b: Contracts.Crypto.Transaction) =>
	b.gasPrice - a.gasPrice;

const sortByLowestGasPrice = (a: Contracts.Crypto.Transaction, b: Contracts.Crypto.Transaction) =>
	a.gasPrice - b.gasPrice;

type SenderQueue = { transactions: Contracts.Crypto.Transaction[]; next: number; queuedAt: number };

// ties go to the transaction queued first; each sender's first transaction is queued in pool order
function* mergeByPriority(
	senders: Contracts.Crypto.Transaction[][],
	prioritySort: SortFunction,
): Generator<Contracts.Crypto.Transaction> {
	let queued = 0;
	const heap = new Heap<SenderQueue>(
		(a, b) => prioritySort(a.transactions[a.next], b.transactions[b.next]) || a.queuedAt - b.queuedAt,
	);
	heap.init(senders.map((transactions) => ({ next: 0, queuedAt: queued++, transactions })));

	for (let sender = heap.peek(); sender; sender = heap.peek()) {
		yield sender.transactions[sender.next];

		sender.next++;
		if (sender.next < sender.transactions.length) {
			sender.queuedAt = queued++;
			// replace() overwrites the root before comparing, so the root may be re-keyed first
			heap.replace(sender);
		} else {
			heap.pop();
		}
	}
}

export class QueryIterable implements Contracts.TransactionPool.QueryIterable {
	public transactions: Iterable<Contracts.Crypto.Transaction>;
	public predicates: Contracts.TransactionPool.QueryPredicate[] = [];

	public constructor(
		transactions: Iterable<Contracts.Crypto.Transaction>,
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
		const transaction = await this.#find();
		if (!transaction) {
			throw new Error("Transaction not found");
		}

		return transaction;
	}

	public async has(): Promise<boolean> {
		return (await this.#find()) !== undefined;
	}

	public wherePredicate(predicate: Contracts.TransactionPool.QueryPredicate): QueryIterable {
		this.predicates.push(predicate);

		return this;
	}

	public whereHash(hash: string): QueryIterable {
		return this.wherePredicate(async (t) => t.hash === hash);
	}

	async #find(): Promise<Contracts.Crypto.Transaction | undefined> {
		for (const transaction of this.transactions) {
			if (await this.#satisfiesPredicates(transaction)) {
				return transaction;
			}
		}

		return undefined;
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

	public getAllBySender(address: string): QueryIterable {
		if (!this.mempool.hasSenderMempool(address)) {
			return new QueryIterable([]);
		}

		return new QueryIterable([...this.mempool.getSenderMempool(address).getFromEarliest()]);
	}

	public getFromLowestPriority(): QueryIterable {
		return this.#getTransactions((senderMempool) => [...senderMempool.getFromLatest()], sortByLowestGasPrice);
	}

	public getFromHighestPriority(): QueryIterable {
		return this.#getTransactions((senderMempool) => [...senderMempool.getFromEarliest()], sortByHighestGasPrice);
	}

	#getTransactions(selector: SenderMempoolSelectorFunction, prioritySort: SortFunction): QueryIterable {
		const senders = [...this.mempool.getSenderMempools()]
			.map((senderMempool) => selector(senderMempool))
			.filter((transactions) => transactions.length > 0);

		return new QueryIterable({ [Symbol.iterator]: () => mergeByPriority(senders, prioritySort) });
	}
}

import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { Comparator, IteratorMany } from "./utils";

export class QueryIterable implements Contracts.TransactionPool.QueryIterable {
	public transactions: Iterable<Contracts.Crypto.ITransaction>;
	public predicate?: Contracts.TransactionPool.QueryPredicate;

	public constructor(
		transactions: Iterable<Contracts.Crypto.ITransaction>,
		predicate?: Contracts.TransactionPool.QueryPredicate,
	) {
		this.transactions = transactions;
		this.predicate = predicate;
	}

	public *[Symbol.iterator](): Iterator<Contracts.Crypto.ITransaction> {
		for (const transaction of this.transactions) {
			if (!this.predicate || this.predicate(transaction)) {
				yield transaction;
			}
		}
	}

	public wherePredicate(predicate: Contracts.TransactionPool.QueryPredicate): QueryIterable {
		return new QueryIterable(this, predicate);
	}

	public whereId(id: string): QueryIterable {
		return this.wherePredicate(async (t) => t.id === id);
	}

	public whereType(type: Contracts.Crypto.TransactionType | number): QueryIterable {
		return this.wherePredicate(async (t) => t.type === type);
	}

	public whereTypeGroup(typeGroup: Contracts.Crypto.TransactionTypeGroup | number): QueryIterable {
		return this.wherePredicate(async (t) => t.typeGroup === typeGroup);
	}

	public whereVersion(version: number): QueryIterable {
		return this.wherePredicate(async (t) => t.data.version === version);
	}

	public whereKind(transaction: Contracts.Crypto.ITransaction): QueryIterable {
		return this.wherePredicate(async (t) => t.type === transaction.type && t.typeGroup === transaction.typeGroup);
	}

	public has(): boolean {
		for (const _ of this) {
			return true;
		}
		return false;
	}

	public first(): Contracts.Crypto.ITransaction {
		for (const transaction of this) {
			return transaction;
		}
		throw new Error("Transaction not found");
	}
}

@injectable()
export class Query implements Contracts.TransactionPool.Query {
	@inject(Identifiers.TransactionPoolMempool)
	private readonly mempool!: Contracts.TransactionPool.Mempool;

	public getAll(): QueryIterable {
		const iterable: Iterable<Contracts.Crypto.ITransaction> = function* (this: Query) {
			for (const senderMempool of this.mempool.getSenderMempools()) {
				for (const transaction of senderMempool.getFromLatest()) {
					yield transaction;
				}
			}
		}.bind(this)();

		return new QueryIterable(iterable);
	}

	public getAllBySender(senderPublicKey: string): QueryIterable {
		const iterable: Iterable<Contracts.Crypto.ITransaction> = function* (this: Query) {
			if (this.mempool.hasSenderMempool(senderPublicKey)) {
				const transactions = this.mempool.getSenderMempool(senderPublicKey).getFromEarliest();
				for (const transaction of transactions) {
					yield transaction;
				}
			}
		}.bind(this)();

		return new QueryIterable(iterable);
	}

	public getFromLowestPriority(): QueryIterable {
		const iterable = {
			[Symbol.iterator]: () => {
				const comparator: Comparator<Contracts.Crypto.ITransaction> = (
					a: Contracts.Crypto.ITransaction,
					b: Contracts.Crypto.ITransaction,
				) => a.data.fee.comparedTo(b.data.fee);

				const iterators: Iterator<Contracts.Crypto.ITransaction>[] = [...this.mempool.getSenderMempools()]
					.map((p) => p.getFromLatest())
					.map((index) => index[Symbol.iterator]());

				return new IteratorMany<Contracts.Crypto.ITransaction>(iterators, comparator);
			},
		};

		return new QueryIterable(iterable);
	}

	public getFromHighestPriority(): QueryIterable {
		const iterable = {
			[Symbol.iterator]: () => {
				const comparator: Comparator<Contracts.Crypto.ITransaction> = (
					a: Contracts.Crypto.ITransaction,
					b: Contracts.Crypto.ITransaction,
				) => b.data.fee.comparedTo(a.data.fee);

				const iterators: Iterator<Contracts.Crypto.ITransaction>[] = [...this.mempool.getSenderMempools()]
					.map((p) => p.getFromEarliest())
					.map((index) => index[Symbol.iterator]());

				return new IteratorMany<Contracts.Crypto.ITransaction>(iterators, comparator);
			},
		};

		return new QueryIterable(iterable);
	}
}

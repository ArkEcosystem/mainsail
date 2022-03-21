import { inject, injectable } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

export class QueryIterable implements Contracts.TransactionPool.QueryIterable {
	public transactions: Contracts.Crypto.ITransaction[];
	public predicates: Contracts.TransactionPool.QueryPredicate[] = [];

	public constructor(
		transactions: Contracts.Crypto.ITransaction[],
		predicate?: Contracts.TransactionPool.QueryPredicate,
	) {
		this.transactions = transactions;

		if (predicate) {
			this.predicates.push(predicate);
		}
	}

	public async all(): Promise<Contracts.Crypto.ITransaction[]> {
		const transactions = [];

		for (const transaction of this.transactions) {
			if (await this.#satisfiesPredicates(transaction)) {
				transactions.push(transaction);
			}
		}

		return transactions;
	}

	public async first(): Promise<Contracts.Crypto.ITransaction> {
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

	async #satisfiesPredicates(transaction: Contracts.Crypto.ITransaction): Promise<boolean> {
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
	@inject(Identifiers.TransactionPoolMempool)
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
		return new QueryIterable(
			[...this.mempool.getSenderMempools()]
				.flatMap((senderMempool) => [...senderMempool.getFromLatest()])
				.sort((a: Contracts.Crypto.ITransaction, b: Contracts.Crypto.ITransaction) =>
					a.data.fee.comparedTo(b.data.fee),
				),
		);
	}

	public getFromHighestPriority(): QueryIterable {
		return new QueryIterable(
			[...this.mempool.getSenderMempools()]
				.flatMap((senderMempool) => [...senderMempool.getFromEarliest()])
				.sort((a: Contracts.Crypto.ITransaction, b: Contracts.Crypto.ITransaction) =>
					b.data.fee.comparedTo(a.data.fee),
				),
		);
	}
}

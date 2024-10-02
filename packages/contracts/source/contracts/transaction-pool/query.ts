import { Transaction, TransactionType } from "../crypto/index.js";

export type QueryPredicate = (transaction: Transaction) => Promise<boolean>;

export interface Query {
	getAll(): QueryIterable;
	getAllBySender(senderPublicKey: string): QueryIterable;
	getFromLowestPriority(): QueryIterable;
	getFromHighestPriority(): QueryIterable;
}

export interface QueryIterable {
	wherePredicate(predicate: QueryPredicate): QueryIterable;
	whereId(id: string): QueryIterable;
	whereType(type: TransactionType | number): QueryIterable;

	has(): Promise<boolean>;
	first(): Promise<Transaction>;
	all(): Promise<Transaction[]>;
}

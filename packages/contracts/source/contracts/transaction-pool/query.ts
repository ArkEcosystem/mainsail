import { Transaction, TransactionType, TransactionTypeGroup } from "../crypto";

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
	whereTypeGroup(typeGroup: TransactionTypeGroup | number): QueryIterable;
	whereVersion(version: number): QueryIterable;
	whereKind(transaction: Transaction): QueryIterable;

	has(): Promise<boolean>;
	first(): Promise<Transaction>;
	all(): Promise<Transaction[]>;
}

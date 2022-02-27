import Interfaces, { TransactionType, TransactionTypeGroup } from "@arkecosystem/core-crypto-contracts";

export type QueryPredicate = (transaction: Interfaces.ITransaction) => Promise<boolean>;

export interface Query {
	getAll(): QueryIterable;
	getAllBySender(senderPublicKey: string): QueryIterable;
	getFromLowestPriority(): QueryIterable;
	getFromHighestPriority(): QueryIterable;
}

export interface QueryIterable extends Iterable<Interfaces.ITransaction> {
	wherePredicate(predicate: QueryPredicate): QueryIterable;
	whereId(id: string): QueryIterable;
	whereType(type: TransactionType | number): QueryIterable;
	whereTypeGroup(typeGroup: TransactionTypeGroup | number): QueryIterable;
	whereVersion(version: number): QueryIterable;
	whereKind(transaction: Interfaces.ITransaction): QueryIterable;

	has(): boolean;
	first(): Interfaces.ITransaction;
}

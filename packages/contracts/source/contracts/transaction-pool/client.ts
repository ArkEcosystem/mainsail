import { CommitHandler, Transaction } from "../crypto/index.js";
export interface Client extends CommitHandler {
	setFailedTransactions(transactions: Transaction[]): void;
	getTransactionBytes(): Promise<Buffer[]>;
}

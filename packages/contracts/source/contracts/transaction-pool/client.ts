import { CommitHandler, Transaction } from "../crypto/index.js";
export interface Client extends CommitHandler {
	setFailedTransactions(transactions: Transaction[]): void;
	getTransactionBytes(): Promise<Buffer[]>;
	listSnapshots(): Promise<number[]>;
	importSnapshot(height: number): Promise<void>;
}

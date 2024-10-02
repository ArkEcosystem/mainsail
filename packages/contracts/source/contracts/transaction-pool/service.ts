import { Transaction } from "../crypto/index.js";

export interface Service {
	getPoolSize(): number;

	addTransaction(transaction: Transaction): Promise<void>;
	reAddTransactions(): Promise<void>;
	commit(transactions: {transaction: Transaction, gasUsed: number}[]): Promise<void>;
	flush(): Promise<void>;
}

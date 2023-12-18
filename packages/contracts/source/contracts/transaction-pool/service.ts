import { Transaction } from "../crypto";

export interface Service {
	getPoolSize(): number;

	addTransaction(transaction: Transaction): Promise<void>;
	reAddTransactions(): Promise<void>;
	removeTransaction(transaction: Transaction): Promise<void>;
	removeForgedTransaction(transaction: Transaction): Promise<void>;
	cleanUp(): Promise<void>;
	flush(): Promise<void>;
}

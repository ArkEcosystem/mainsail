import { Block, Transaction } from "../crypto/index.js";

export interface Service {
	getPoolSize(): number;

	addTransaction(transaction: Transaction): Promise<void>;
	reAddTransactions(): Promise<void>;
	removeTransaction(transaction: Transaction): Promise<void>;
	commit(block: Block, removedTransactions: string[]): Promise<void>;
	flush(): Promise<void>;
}

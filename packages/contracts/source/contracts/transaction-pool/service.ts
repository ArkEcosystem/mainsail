import { Block, Transaction } from "../crypto/index.js";

export interface Service {
	getPoolSize(): number;

	addTransaction(transaction: Transaction): Promise<void>;
	reAddTransactions(): Promise<void>;
	commit(block: Block, failedTransactionIds: string[]): Promise<void>;
	flush(): Promise<void>;
}

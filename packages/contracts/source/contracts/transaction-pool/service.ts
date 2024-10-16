import { Transaction } from "../crypto/index.js";

export interface Service {
	getPoolSize(): number;

	addTransaction(transaction: Transaction): Promise<void>;
	reAddTransactions(): Promise<void>;
	commit(sendersAddresses: string[]): Promise<void>;
	flush(): Promise<void>;
}

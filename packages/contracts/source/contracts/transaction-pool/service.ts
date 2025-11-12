import type { Transaction } from "../crypto/index.js";

export interface Service {
	getPoolSize(): number;

	addTransaction(transaction: Transaction): Promise<void>;
	reAddTransactions(): Promise<void>;
	commit(sendersAddresses: string[], consumedGas: number, isSyncing: boolean): Promise<void>;
	flush(): Promise<void>;
}

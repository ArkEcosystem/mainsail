import { Transaction } from "../crypto/transactions.js";

export interface SenderMempool {
	isDisposable(): boolean;
	getSize(): number;

	getFromEarliest(): Iterable<Transaction>;
	getFromLatest(): Iterable<Transaction>;

	addTransaction(transaction: Transaction): Promise<void>;
	removeTransaction(hash: string): Transaction[];
	reAddTransactions(): Promise<Transaction[]>;
}

export type SenderMempoolFactory = (address: string, legacyAddress?: string) => Promise<SenderMempool>;

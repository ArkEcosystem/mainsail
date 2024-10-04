import { Transaction } from "../crypto/transactions.js";

export interface SenderMempool {
	isDisposable(): boolean;
	getSize(): number;

	getFromEarliest(): Iterable<Transaction>;
	getFromLatest(): Iterable<Transaction>;

	addTransaction(transaction: Transaction): Promise<void>;
	removeTransaction(id: string): Transaction[];
	reAddTransactions(): Promise<Transaction[]>;
}

export type SenderMempoolFactory = (address: string) => Promise<SenderMempool>;

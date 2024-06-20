import { Transaction } from "../crypto/transactions.js";

export interface SenderMempool {
	isDisposable(): boolean;
	getSize(): number;

	getFromEarliest(): Iterable<Transaction>;
	getFromLatest(): Iterable<Transaction>;

	addTransaction(transaction: Transaction): Promise<void>;
	removeTransaction(id: string): Promise<Transaction[]>;
	removeForgedTransaction(id: string): Promise<boolean>;
}

export type SenderMempoolFactory = (publicKey: string) => Promise<SenderMempool>;

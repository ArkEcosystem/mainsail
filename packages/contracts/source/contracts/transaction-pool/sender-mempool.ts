import { Transaction } from "../crypto";

export interface SenderMempool {
	isDisposable(): boolean;
	getSize(): number;

	getFromEarliest(): Iterable<Transaction>;
	getFromLatest(): Iterable<Transaction>;

	addTransaction(transaction: Transaction): Promise<void>;
	removeTransaction(id: string): Promise<Transaction[]>;
	removeForgedTransaction(id: string): Promise<Transaction[]>;
}

export type SenderMempoolFactory = (publicKey: string) => Promise<SenderMempool>;

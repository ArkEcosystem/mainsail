import { ITransaction } from "../crypto";

export interface SenderMempool {
	isDisposable(): boolean;
	getSize(): number;

	getFromEarliest(): Iterable<ITransaction>;
	getFromLatest(): Iterable<ITransaction>;

	addTransaction(transaction: ITransaction): Promise<void>;
	removeTransaction(id: string): Promise<ITransaction[]>;
	removeForgedTransaction(id: string): Promise<ITransaction[]>;
}

export type SenderMempoolFactory = () => SenderMempool;

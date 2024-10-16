import { Transaction } from "../crypto/index.js";
import { SenderMempool } from "./sender-mempool.js";

export interface Mempool {
	getSize(): number;

	hasSenderMempool(address: string): boolean;
	getSenderMempool(address: string): SenderMempool;
	getSenderMempools(): Iterable<SenderMempool>;

	addTransaction(transaction: Transaction): Promise<void>;
	removeTransaction(address: string, id: string): Promise<Transaction[]>;
	reAddTransactions(addresses: string[]): Promise<Transaction[]>;

	flush(): void;
}

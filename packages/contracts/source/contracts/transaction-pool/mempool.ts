import { Transaction } from "../crypto/transactions.js";
import { SenderMempool } from "./sender-mempool.js";

export interface Mempool {
	getSize(): number;

	hasSenderMempool(senderPublicKey: string): boolean;
	getSenderMempool(senderPublicKey: string): SenderMempool;
	getSenderMempools(): Iterable<SenderMempool>;

	addTransaction(transaction: Transaction): Promise<void>;
	removeTransaction(senderPublicKey: string, id: string): Promise<Transaction[]>;
	removeForgedTransaction(senderPublicKey: string, id: string): Promise<Transaction[]>;

	flush(): void;
}

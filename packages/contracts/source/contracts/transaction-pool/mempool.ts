import { Transaction } from "../crypto";
import { SenderMempool } from "./sender-mempool";

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

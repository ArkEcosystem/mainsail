import { Block, Transaction } from "../crypto/index.js";
import { SenderMempool } from "./sender-mempool.js";

export interface Mempool {
	getSize(): number;

	hasSenderMempool(senderPublicKey: string): boolean;
	getSenderMempool(senderPublicKey: string): SenderMempool;
	getSenderMempools(): Iterable<SenderMempool>;

	commit(block: Block, removedTransactions: Transaction[]): Promise<Transaction[]>;

	addTransaction(transaction: Transaction): Promise<void>;
	removeTransaction(senderPublicKey: string, id: string): Promise<Transaction[]>;

	flush(): void;
}

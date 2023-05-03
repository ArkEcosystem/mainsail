import { ITransaction } from "../crypto";
import { SenderMempool } from "./sender-mempool";

export interface Mempool {
	getSize(): number;

	hasSenderMempool(senderPublicKey: string): boolean;
	getSenderMempool(senderPublicKey: string): SenderMempool;
	getSenderMempools(): Iterable<SenderMempool>;

	addTransaction(transaction: ITransaction): Promise<void>;
	removeTransaction(senderPublicKey: string, id: string): Promise<ITransaction[]>;
	removeForgedTransaction(senderPublicKey: string, id: string): Promise<ITransaction[]>;

	flush(): void;
}

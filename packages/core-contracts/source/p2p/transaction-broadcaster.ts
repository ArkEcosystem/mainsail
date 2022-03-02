import { ITransaction } from "../crypto";

export interface TransactionBroadcaster {
	broadcastTransactions(transactions: ITransaction[]): Promise<void>;
}

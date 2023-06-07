import { ITransaction } from "../crypto";

export interface Broadcaster {
	broadcastTransactions(transactions: ITransaction[]): Promise<void>;
}

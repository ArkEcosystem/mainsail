import { IBlock, ITransaction } from "../crypto";

export interface Broadcaster {
	broadcastTransactions(transactions: ITransaction[]): Promise<void>;
	broadcastBlock(block: IBlock): Promise<void>;
}

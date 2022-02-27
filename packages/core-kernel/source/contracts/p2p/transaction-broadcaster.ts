import Interfaces from "@arkecosystem/core-crypto-contracts";

export interface TransactionBroadcaster {
	broadcastTransactions(transactions: Interfaces.ITransaction[]): Promise<void>;
}

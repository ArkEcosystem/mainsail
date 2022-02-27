import Interfaces from "@arkecosystem/core-crypto-contracts";

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: Interfaces.ITransaction): Promise<void>;
	throwIfCannotBroadcast(transaction: Interfaces.ITransaction): Promise<void>;
}

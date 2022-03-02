import { Crypto } from "@arkecosystem/core-contracts";

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: Crypto.ITransaction): Promise<void>;
	throwIfCannotBroadcast(transaction: Crypto.ITransaction): Promise<void>;
}

export interface ProcessorExtension {
	throwIfCannotBroadcast(transaction: Crypto.ITransaction): Promise<void>;
}

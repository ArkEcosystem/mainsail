import { Contracts } from "@mainsail/contracts";

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: Contracts.Crypto.ITransaction): Promise<void>;
	throwIfCannotBroadcast(transaction: Contracts.Crypto.ITransaction): Promise<void>;
}

export interface ProcessorExtension {
	throwIfCannotBroadcast(transaction: Contracts.Crypto.ITransaction): Promise<void>;
}

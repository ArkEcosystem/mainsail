import { Contracts } from "@mainsail/contracts";

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: Contracts.Crypto.Transaction): Promise<void>;
	throwIfCannotBroadcast(transaction: Contracts.Crypto.Transaction): Promise<void>;
}

export interface ProcessorExtension {
	throwIfCannotBroadcast(transaction: Contracts.Crypto.Transaction): Promise<void>;
}

import { Interfaces } from "@arkecosystem/crypto";

export interface DynamicFeeMatcher {
	throwIfCannotEnterPool(transaction: Interfaces.ITransaction): Promise<void>;
	throwIfCannotBroadcast(transaction: Interfaces.ITransaction): Promise<void>;
}

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: Interfaces.ITransaction): Promise<void>;
	throwIfCannotBroadcast(transaction: Interfaces.ITransaction): Promise<void>;
}

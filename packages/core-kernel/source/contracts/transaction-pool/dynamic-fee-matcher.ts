import { Interfaces } from "@arkecosystem/crypto";

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: Interfaces.ITransaction): Promise<void>;
	throwIfCannotBroadcast(transaction: Interfaces.ITransaction): Promise<void>;
}

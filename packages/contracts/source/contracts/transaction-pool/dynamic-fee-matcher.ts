import { Transaction } from "../crypto/transactions.js";

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: Transaction): Promise<void>;
	throwIfCannotBroadcast(transaction: Transaction): Promise<void>;
}

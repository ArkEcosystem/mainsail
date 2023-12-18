import { Transaction } from "../crypto";

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: Transaction): Promise<void>;
	throwIfCannotBroadcast(transaction: Transaction): Promise<void>;
}

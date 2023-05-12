import { ITransaction } from "../crypto";

export interface FeeMatcher {
	throwIfCannotEnterPool(transaction: ITransaction): Promise<void>;
	throwIfCannotBroadcast(transaction: ITransaction): Promise<void>;
}

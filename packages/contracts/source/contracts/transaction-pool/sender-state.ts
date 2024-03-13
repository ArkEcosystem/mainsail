import { Transaction } from "../crypto/transactions.js";

export interface SenderState {
	configure(publicKey: string): Promise<SenderState>;
	apply(transaction: Transaction): Promise<void>;
	revert(transaction: Transaction): Promise<void>;
}

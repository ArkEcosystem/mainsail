import { Transaction } from "../crypto/transactions.js";

export interface SenderState {
	configure(address: string): Promise<SenderState>;
	apply(transaction: Transaction): Promise<void>;
}

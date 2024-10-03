import { Transaction } from "../crypto/transactions.js";

export interface SenderState {
	configure(address: string): Promise<SenderState>;
	reset(): Promise<void>;
	apply(transaction: Transaction): Promise<void>;
}

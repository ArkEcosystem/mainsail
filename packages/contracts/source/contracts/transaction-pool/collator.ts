import { Transaction } from "../crypto/transactions.js";

export interface Collator {
	getBlockCandidateTransactions(): Promise<Transaction[]>;
}

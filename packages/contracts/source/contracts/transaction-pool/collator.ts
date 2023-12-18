import { Transaction } from "../crypto";

export interface Collator {
	getBlockCandidateTransactions(): Promise<Transaction[]>;
}

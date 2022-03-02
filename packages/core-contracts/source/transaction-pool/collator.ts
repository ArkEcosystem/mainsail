import { ITransaction } from "../crypto";

export interface Collator {
	getBlockCandidateTransactions(): Promise<ITransaction[]>;
}

import { Transaction } from "../crypto/transactions.js";
import { CommitKey } from "../evm/evm.js";

export interface CollatorTransaction extends Transaction {
	readonly gasUsed: number;
}

export interface Collator {
	getBlockCandidateTransactions(commitKey: CommitKey): Promise<CollatorTransaction[]>;
}

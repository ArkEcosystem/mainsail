import Interfaces from "@arkecosystem/core-crypto-contracts";

export interface Collator {
	getBlockCandidateTransactions(): Promise<Interfaces.ITransaction[]>;
}

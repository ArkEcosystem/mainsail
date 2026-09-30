import type { Block, Transaction } from "./crypto/index.js";
import type { CommitKey } from "./evm/index.js";

export interface TransactionForger {
	initialize(generatorAddress: string, timestamp: number, commitKey: CommitKey): TransactionForger;

	getTransactions(): Promise<{
		logsBloom: string;
		stateRoot: string;
		transactions: Transaction[];
		gasUsed: number;
		fee: bigint;
	}>;
}

export interface BlockForger {
	forgeBlock(generatorAddress: string, round: number, timestamp: number, randaoReveal: string): Promise<Block>;
}

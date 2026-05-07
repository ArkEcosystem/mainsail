import type { Block, Transaction } from "./crypto/index.js";
import type { CommitKey } from "./evm/index.js";


export interface TransactionForger {
	getTransactions(
		generatorAddress: string,
		timestamp: number,
		commitKey: CommitKey,
	): Promise<{
		logsBloom: string;
		stateRoot: string;
		transactions: Transaction[];
		gasUsed: number;
		fee: bigint;
	}>;
}

export interface BlockForger {
	forgeBlock(generatorAddress: string, round: number, timestamp: number): Promise<Block>;
}

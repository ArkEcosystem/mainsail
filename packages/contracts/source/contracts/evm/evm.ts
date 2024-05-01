import { CommitHandler } from "../crypto/commit.js";

export interface Instance extends CommitHandler {
	setAutoCommit(enabled: boolean): Promise<void>;
	process(txContext: TransactionContext): Promise<ProcessResult>;
}

export interface ProcessResult {
	readonly receipt: TransactionReceipt;
}
export interface CommitResult {}

export interface TransactionContext {
	readonly caller: string;
	/** Omit recipient when deploying a contract */
	readonly recipient?: string;
	readonly data: Buffer;
	readonly commitKey?: CommitKey;
}

export interface CommitKey {
	readonly height: bigint;
	readonly round: bigint;
}

export interface TransactionReceipt {
	readonly gasUsed: bigint;
	readonly gasRefunded: bigint;
	readonly success: boolean;
	readonly deployedContractAddress?: string;
	readonly logs: any;
	readonly output?: Buffer;
}

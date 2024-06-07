import { CommitHandler } from "../crypto/commit.js";

export interface Instance extends CommitHandler {
	process(txContext: TransactionContext): Promise<ProcessResult>;
	view(viewContext: TransactionViewContext): Promise<ViewResult>;
}

export interface ProcessResult {
	readonly receipt: TransactionReceipt;
	readonly mocked?: boolean;
}

export interface ViewResult {
	readonly success: boolean;
	readonly output?: Buffer;
}

export interface CommitResult {}

export interface TransactionContext {
	readonly caller: string;
	/** Omit recipient when deploying a contract */
	readonly recipient?: string;
	readonly gasLimit: bigint;
	readonly data: Buffer;
	readonly commitKey: CommitKey;
	readonly sequence?: number;
}

export interface TransactionViewContext {
	readonly caller: string;
	readonly recipient: string;
	readonly data: Buffer;
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

	// See evm.ts
	readonly cached?: boolean;
}

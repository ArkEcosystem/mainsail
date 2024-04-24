export interface Instance {
	process(txContext: TransactionContext): Promise<ProcessResult>;
	commit(): Promise<CommitResult>;
}

export interface ProcessResult {
	readonly receipt: TransactionReceipt;
}
export interface CommitResult {}

export interface TransactionContext {
	readonly readonly: boolean;
	readonly caller: string;
	/** Omit recipient when deploying a contract */
	readonly recipient?: string;
	readonly data: Buffer;
}

export interface TransactionReceipt {
	readonly gasUsed: bigint;
	readonly gasRefunded: bigint;
	readonly success: boolean;
	readonly deployedContractAddress?: string;
	readonly logs: any;
	readonly output?: Buffer;
}

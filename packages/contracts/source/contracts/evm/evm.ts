export interface Instance {
	configureBlockEnvironment(environment: BlockEnvironment): Promise<void>;
	transact(txContext: TransactionContext): Promise<TransactionResult>;
	view(txContext: TransactionContext): Promise<TransactionResult>;
}

export interface BlockEnvironment {
	number: bigint;
	timestamp: bigint;
	gasLimit: bigint;
	basefee: bigint;
	difficulty: bigint;
}

export interface TransactionContext {
	caller: string;
	/** Omit recipient when deploying a contract */
	recipient?: string;
	data: Buffer;
}

export interface TransactionResult {
	gasUsed: bigint;
	gasRefunded: bigint;
	success: boolean;
	deployedContractAddress?: string;
	logs: any;
	output?: Buffer;
}

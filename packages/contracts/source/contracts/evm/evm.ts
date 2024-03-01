export interface Instance {
	transact(txContext: TransactionContext): Promise<TransactionResult>;
	view(txContext: TransactionContext): Promise<TransactionResult>;
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

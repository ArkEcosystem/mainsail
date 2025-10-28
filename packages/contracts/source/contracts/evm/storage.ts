export interface ProofStorageData {
	readonly round: number;
	readonly signature: string;
	readonly validatorSet: bigint;
}

export interface BlockHeaderStorageData {
	readonly hash: string;
	readonly timestamp: bigint;
	readonly version: number;
	readonly number: number;
	readonly round: number;
	readonly parentHash: string;
	readonly stateRoot: string;
	readonly logsBloom: string;
	readonly transactionsCount: number;
	readonly gasUsed: number;
	readonly fee: bigint;
	readonly reward: bigint;
	readonly payloadSize: number;
	readonly transactionsRoot: string;
	readonly proposer: string;
}

export interface TransactionStorageData {
	readonly from: string;
	readonly senderPublicKey: string;
	readonly legacyAddress?: string;
	readonly to?: string;
	readonly gasLimit: bigint;
	readonly gasPrice: bigint;
	readonly value: bigint;
	readonly nonce: bigint;

	readonly data: Buffer;

	readonly txHash: string;
	readonly index: number;
	readonly blockNumber: number;
	readonly legacySecondSignature?: string;

	readonly v: number;
	readonly r: string;
	readonly s: string;
}

export interface CommitStorageData {
	readonly proof: ProofStorageData;
	readonly header: BlockHeaderStorageData;
	readonly transactions: TransactionStorageData[];
}

export interface Storage {
	getState(): Promise<{ blockNumber: number; totalRound: number }>;
	getBlockHeaderData(blockNumber: number): Promise<BlockHeaderStorageData | undefined | null>;
	getBlockNumberByHash(blockHash: string): Promise<number | undefined | null>;
	getCommitData(blockNumber: number): Promise<CommitStorageData | undefined | null>;
	getTransactionData(key: string): Promise<TransactionStorageData | undefined | null>;
	getTransactionKeyByHash(txHash: string): Promise<string | undefined | null>;
	isEmpty(): Promise<boolean>;
}

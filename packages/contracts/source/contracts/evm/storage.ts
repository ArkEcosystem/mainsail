export interface Storage {
	getState(): Promise<{ blockNumber: number; totalRound: number }>;
	getBlockHeaderBytes(blockNumber: number): Promise<Buffer | undefined | null>;
	getBlockNumberByHash(blockHash: string): Promise<number | undefined | null>;
	getProofBytes(blockNumber: number): Promise<Buffer | undefined | null>;
	getCommitBytes(blockNumber: number): Promise<Buffer | undefined | null>;
	getTransactionBytes(key: string): Promise<Buffer | undefined | null>;
	getTransactionKeyByHash(txHash: string): Promise<string | undefined | null>;
	isEmpty(): Promise<boolean>;
}

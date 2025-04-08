export interface Storage {
	getState(): Promise<{ blockNumber: number; totalRound: number }>;
	getBlockHeaderBytes(blockNumber: number): Promise<Buffer | undefined>;
	getBlockNumberByHash(blockHash: string): Promise<number | undefined>;
	getProofBytes(blockNumber: number): Promise<Buffer | undefined>;
	getTransactionBytes(key: string): Promise<Buffer | undefined>;
	getTransactionKeyByHash(txHash: string): Promise<string | undefined>;
	isEmpty(): Promise<boolean>;
}

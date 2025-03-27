export interface Storage {
	getState(): Promise<{ height: number; totalRound: number }>;
	getBlockHeaderBytes(height: number): Promise<Buffer | undefined>;
	getBlockHeightById(id: string): Promise<number | undefined>;
	getProofBytes(height: number): Promise<Buffer | undefined>;
	getTransactionBytes(key: string): Promise<Buffer | undefined>;
	getTransactionKeyById(id: string): Promise<string | undefined>;
	isEmpty(): Promise<boolean>;
}

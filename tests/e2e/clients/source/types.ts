export interface Client {
	readonly name: string;
	getChainId(): Promise<number>;
	getHeight(): Promise<number>;
	getBlock(tagOrNumber: string | number): Promise<Record<string, any>>;
	getTransaction(hash: string): Promise<Record<string, any>>;
	getTransactionByBlockNumberAndIndex(blockNumber: number, index: number): Promise<Record<string, any>>;
	getReceipt(hash: string): Promise<Record<string, any>>;
	getBalance(address: string): Promise<number>;
	getNonce(address: string): Promise<number>;
	getCode(address: string): Promise<string>;
	getStorageAt(address: string, position: string): Promise<string>;
	call(address: string, data: string): Promise<string>;
	sendTx(serialized: string): Promise<string>;
}

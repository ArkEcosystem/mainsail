export type StoredTransaction = {
	blockNumber: number;
	hash: string;
	senderPublicKey: string;
	serialized: Buffer;
};

export interface Storage {
	addTransaction(storedTransaction: StoredTransaction): void;
	hasTransaction(hash: string): boolean;
	getAllTransactions(): Iterable<StoredTransaction>;
	getOldTransactions(blockNumber: number): Iterable<StoredTransaction>;
	removeTransaction(hash: string): void;
	flush(): void;
}

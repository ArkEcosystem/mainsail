import type { Transaction } from "../crypto/index.js";

export type GetBatchOptions = {
	blockRound: string;
	maxSize: number;
	maxBytes: number;
};

export type GetBatchResult = {
	transactions: Transaction[];
	remaining: number;
};

export interface Selector {
	getBatch(options: GetBatchOptions): Promise<GetBatchResult>;
	clear(): void;
}

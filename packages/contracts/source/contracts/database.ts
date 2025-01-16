import { Block, BlockHeader, Commit, Transaction } from "./crypto/index.js";

export interface State {
	height: number;
	totalRound: number;
}

export interface DatabaseService {
	initialize(): Promise<void>;
	isEmpty(): boolean;

	getState(): State;

	getCommit(height: number): Promise<Commit | undefined>;
	getCommitById(id: string): Promise<Commit | undefined>;
	getLastCommit(): Promise<Commit>;
	hasCommitById(id: string): boolean;
	findCommitBuffers(start: number, end: number): Promise<Buffer[]>;
	readCommits(start: number, end: number): AsyncGenerator<Commit>;

	getBlock(height: number): Promise<Block | undefined>;
	getBlockById(id: string): Promise<Block | undefined>;
	findBlocks(start: number, end: number): Promise<Block[]>;

	getBlockHeader(height: number): Promise<BlockHeader | undefined>;
	getBlockHeaderById(id: string): Promise<BlockHeader | undefined>;

	getTransactionById(id: string): Promise<Transaction | undefined>;
	getTransactionByBlockIdAndIndex(blockId: string, index: number): Promise<Transaction | undefined>;
	getTransactionByBlockHeightAndIndex(height: number, index: number): Promise<Transaction | undefined>;

	addCommit(block: Commit): void;
	persist(): Promise<void>;
}

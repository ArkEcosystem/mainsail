import type { Block, BlockHeader, Commit, CommitHandler, Transaction } from "./crypto/index.js";
import type { ProcessableUnit } from "./processor/index.js";

export interface State {
	blockNumber: number;
	totalRound: number;
}

export interface DatabaseService extends CommitHandler {
	initialize(): Promise<void>;
	isEmpty(): Promise<boolean>;

	getState(): State;

	getLastCommit(): Promise<Commit>;
	hasCommitByHash(blockHash: string): Promise<boolean>;
	findCommitBuffers(start: number, end: number): Promise<Buffer[]>;
	readCommits(start: number, end: number): AsyncGenerator<Commit>;

	getBlock(blockNumber: number): Promise<Block | undefined>;
	getBlockByHash(blockHash: string): Promise<Block | undefined>;
	findBlocks(start: number, end: number): Promise<Block[]>;

	getBlockHeader(blockNumber: number): Promise<BlockHeader | undefined>;
	getBlockHeaderByHash(blockHash: string): Promise<BlockHeader | undefined>;

	getTransactionByHash(transactionHash: string): Promise<Transaction | undefined>;
	getTransactionByBlockHashAndIndex(blockHash: string, index: number): Promise<Transaction | undefined>;
	getTransactionByBlockNumberAndIndex(blockNumber: number, index: number): Promise<Transaction | undefined>;

	onCommit(unit: ProcessableUnit): Promise<void>;
}

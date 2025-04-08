import { Block, BlockHeader, Commit, CommitHandler, Transaction } from "./crypto/index.js";
import { ProcessableUnit } from "./processor/index.js";

export interface State {
	blockNumber: number;
	totalRound: number;
}

export interface DatabaseService extends CommitHandler {
	initialize(): Promise<void>;
	isEmpty(): Promise<boolean>;

	getState(): State;

	getCommit(height: number): Promise<Commit | undefined>;
	getCommitById(id: string): Promise<Commit | undefined>;
	getLastCommit(): Promise<Commit>;
	hasCommitById(id: string): Promise<boolean>;
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

	onCommit(unit: ProcessableUnit): Promise<void>;
}

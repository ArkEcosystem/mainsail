import { Block } from "./crypto/block.js";
import { Commit } from "./crypto/commit.js";

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

	findBlocks(start: number, end: number): Promise<Block[]>;

	addCommit(block: Commit): void;
	persist(): Promise<void>;
}

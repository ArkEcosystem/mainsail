import { Block } from "./crypto/block.js";
import { Commit } from "./crypto/commit.js";

export interface DatabaseService {
	getCommit(height: number): Promise<Commit | undefined>;

	findCommitBuffers(start: number, end: number): Promise<Buffer[]>;

	readCommits(start: number, end: number): AsyncGenerator<Commit>;

	findBlocks(start: number, end: number): Promise<Block[]>;

	getLastCommit(): Promise<Commit | undefined>;

	addCommit(block: Commit): void;

	persist(): Promise<void>;
}

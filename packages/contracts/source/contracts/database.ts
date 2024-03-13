import { Block } from "./crypto/block.js";
import { Commit } from "./crypto/commit.js";

export interface DatabaseService {
	getBlock(height: number): Promise<Block | undefined>;

	findCommitBuffers(start: number, end: number): Promise<Buffer[]>;

	readCommits(start: number, end: number): AsyncGenerator<Commit>;

	findBlocks(start: number, end: number): Promise<Block[]>;

	getLastBlock(): Promise<Block | undefined>;

	addCommit(block: Commit): void;

	persist(): Promise<void>;
}

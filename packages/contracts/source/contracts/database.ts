import { Block, CommittedBlock } from "./crypto";

export interface DatabaseService {
	getBlock(height: number): Promise<Block | undefined>;

	findCommitBuffers(start: number, end: number): Promise<Buffer[]>;

	readCommits(start: number, end: number): AsyncGenerator<CommittedBlock>;

	findBlocks(start: number, end: number): Promise<Block[]>;

	getLastBlock(): Promise<Block | undefined>;

	addCommit(block: CommittedBlock): void;

	persist(): Promise<void>;
}

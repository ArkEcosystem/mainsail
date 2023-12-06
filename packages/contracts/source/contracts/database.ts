import { IBlock, ICommittedBlock } from "./crypto";

export interface IDatabaseService {
	getBlock(height: number): Promise<IBlock | undefined>;

	findCommitBuffers(start: number, end: number): Promise<Buffer[]>;

	readCommits(start: number, end: number): AsyncGenerator<ICommittedBlock>;

	findBlocks(start: number, end: number): Promise<IBlock[]>;

	getLastBlock(): Promise<IBlock | undefined>;

	addCommit(block: ICommittedBlock): Promise<void>;
}

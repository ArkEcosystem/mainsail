import { IBlock, ICommittedBlock } from "./crypto";

export interface IDatabaseService {
	getBlock(height: number): Promise<IBlock | undefined>;

	findCommitBuffers(start: number, end: number): Promise<Buffer[]>;

	readCommits(start: number, end: number): AsyncGenerator<ICommittedBlock>;

	findBlocksByHeightRange(start: number, end: number): Promise<IBlock[]>;

	findBlockByHeights(heights: number[]): Promise<IBlock[]>;

	getLastBlock(): Promise<IBlock | undefined>;

	saveBlock(block: ICommittedBlock): Promise<void>;
}

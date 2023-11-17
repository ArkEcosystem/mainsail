import { IBlock, IBlockData, ICommittedBlock } from "./crypto";

export interface IDatabaseService {
	getBlockByHeight(height: number): Promise<IBlock | undefined>;

	findCommittedBlocks(start: number, end: number): Promise<Buffer[]>;

	readCommittedBlocksByHeight(start: number, end: number): AsyncGenerator<ICommittedBlock>;

	findBlocksByHeightRange(start: number, end: number): Promise<IBlock[]>;

	getBlocks(start: number, end: number): Promise<IBlockData[]>;

	findBlockByHeights(heights: number[]): Promise<IBlock[]>;

	getLastBlock(): Promise<IBlock | undefined>;

	saveBlock(block: ICommittedBlock): Promise<void>;
}

import { IBlock, IBlockData, ICommittedBlock } from "./crypto";

export interface IDatabaseService {
	getBlock(id: string): Promise<IBlock | undefined>;

	getBlockByHeight(height: number): Promise<IBlock | undefined>;

	findCommittedBlocks(start: number, end: number): Promise<Buffer[]>;

	readCommittedBlocksByHeight(start: number, end: number): AsyncGenerator<ICommittedBlock>;

	findBlocksByHeightRange(start: number, end: number): Promise<IBlock[]>;

	getBlocks(start: number, end: number): Promise<IBlockData[]>;

	findBlockByHeights(heights: number[]): Promise<IBlock[]>;

	getLastBlock(): Promise<IBlock | undefined>;

	saveBlocks(blocks: ICommittedBlock[]): Promise<void>;
}

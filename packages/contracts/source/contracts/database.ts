import { IBlock, IBlockData, ICommittedBlock, ITransaction } from "./crypto";

export interface IDatabaseService {
	getBlock(id: string): Promise<IBlock | undefined>;

	findCommittedBlocks(start: number, end: number): Promise<Buffer[]>;

	readCommittedBlocksByHeight(start: number, end: number): AsyncGenerator<ICommittedBlock>;

	findBlocksByHeightRange(start: number, end: number): Promise<IBlock[]>;

	getBlocks(start: number, end: number): Promise<IBlockData[]>;

	findBlockByHeights(heights: number[]): Promise<IBlock[]>;

	getLastBlock(): Promise<IBlock | undefined>;

	getTransaction(id: string): Promise<ITransaction | undefined>;

	saveBlocks(blocks: ICommittedBlock[]): Promise<void>;

	findBlocksByIds(ids: string[]): Promise<IBlockData[]>;

	getForgedTransactionsIds(ids: string[]): Promise<string[]>;

	verifyBlockchain(): Promise<boolean>;
}

import { IBlock, IBlockData, ICommittedBlock } from "../crypto";

export interface StateStore {
	isBootstrap(): boolean;

	setBootstrap(value: boolean): void;

	getGenesisBlock(): ICommittedBlock;

	setGenesisBlock(block: ICommittedBlock): void;

	getMaxLastBlocks(): number;

	getLastHeight(): number;

	getLastBlock(): IBlock;

	setLastBlock(block: IBlock): void;

	getLastBlocks(): IBlock[];

	getLastBlockIds(): string[];

	getLastBlocksByHeight(start: number, end?: number, headersOnly?: boolean): IBlockData[];

	getCommonBlocks(ids: string[]): IBlockData[];

	getLastCommittedRound(): number;

	setLastCommittedRound(committedRound: number): void;
}

import { IBlock, ICommittedBlock } from "../crypto";

export interface StateStore {
	isBootstrap(): boolean;

	setBootstrap(value: boolean): void;

	getGenesisBlock(): ICommittedBlock;

	setGenesisBlock(block: ICommittedBlock): void;

	getMaxLastBlocks(): number;

	getLastHeight(): number;

	getLastBlock(): IBlock;

	setLastBlock(block: IBlock): void;

	getLastCommittedRound(): number;

	setLastCommittedRound(committedRound: number): void;
}

import { IBlock, ICommittedBlock } from "../crypto";

export interface StateStore {
	isBootstrap(): boolean;

	setBootstrap(value: boolean): void;

	getGenesisBlock(): ICommittedBlock;

	setGenesisBlock(block: ICommittedBlock): void;

	getLastHeight(): number;

	getLastBlock(): IBlock;

	setLastBlock(block: IBlock): void;

	getTotalRound(): number;

	setTotalRound(totalRound: number): void;
}

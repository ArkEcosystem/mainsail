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

	hasAttribute(key: string): boolean;
	getAttribute<T>(key: string): T;
	setAttribute<T>(key: string, value: T): void;
}

export type StateStoreFactory = (originalStateStore?: StateStore) => StateStore;

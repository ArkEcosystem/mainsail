import { Block } from "../crypto";
import { CommittedBlock } from "../crypto/commit";
import { JsonObject } from "../types";

export interface StateStore {
	isBootstrap(): boolean;
	setBootstrap(value: boolean): void;

	getGenesisBlock(): CommittedBlock;
	setGenesisBlock(block: CommittedBlock): void;

	getLastHeight(): number;
	getLastBlock(): Block;
	setLastBlock(block: Block): void;

	getTotalRound(): number;
	setTotalRound(totalRound: number): void;

	hasAttribute(key: string): boolean;
	getAttribute<T>(key: string): T;
	setAttribute<T>(key: string, value: T): void;

	toJson(): JsonObject;
	fromJson(data: JsonObject): void;
}

export type StateStoreFactory = (originalStateStore?: StateStore) => StateStore;

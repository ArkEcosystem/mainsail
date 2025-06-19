import { Block, Commit, CommitHandler } from "../crypto/index.js";

export interface Store extends CommitHandler {
	getGenesisCommit(): Commit;
	setGenesisCommit(block: Commit): void;

	getLastBlock(): Block;
	setLastBlock(block: Block): void;

	setBlockNumber(blockNumber: number): void;
	getBlockNumber(): number;

	setTotalRound(totalRound: number): void;
	getTotalRound(): number;
}

export type StoreFactory = (originalStore?: Store) => Store;

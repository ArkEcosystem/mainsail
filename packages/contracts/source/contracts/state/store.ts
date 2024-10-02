import { Block, Commit, CommitHandler } from "../crypto/index.js";

export interface Store extends CommitHandler {
	getGenesisCommit(): Commit;
	setGenesisCommit(block: Commit): void;

	getHeight(): number;
	getLastBlock(): Block;
	setLastBlock(block: Block): void;

	setTotalRound(totalRound: number): void;
	getTotalRound(): number;
}

export type StoreFactory = (originalStore?: Store) => Store;

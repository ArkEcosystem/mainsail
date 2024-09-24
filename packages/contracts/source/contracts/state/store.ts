import { Block, Commit, CommitHandler } from "../crypto/index.js";

export interface Store extends CommitHandler {
	getGenesisCommit(): Commit;
	setGenesisCommit(block: Commit): void;

	getLastHeight(): number;
	getLastBlock(): Block;
	setLastBlock(block: Block): void;

	setTotalRoundAndHeight(totalRound: number, height: number): void;
	getTotalRound(): number;
}

export type StoreFactory = (originalStore?: Store) => Store;

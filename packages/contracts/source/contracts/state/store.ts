import { Block, Commit, CommitHandler } from "../crypto/index.js";
import { StateRepositoryChange } from "./repository.js";
import { WalletRepository, WalletRepositoryChange } from "./wallets.js";

export type StoreChange = {
	walletRepository: WalletRepositoryChange;
	store: StateRepositoryChange;
};

export interface Store extends CommitHandler {
	readonly walletRepository: WalletRepository;

	getGenesisCommit(): Commit;
	setGenesisCommit(block: Commit): void;

	getLastHeight(): number;
	getLastBlock(): Block;
	setLastBlock(block: Block): void;

	setTotalRoundAndHeight(totalRound: number, height: number): void;
	getTotalRound(): number;

	hasAttribute(key: string): boolean;
	getAttribute<T>(key: string): T;
	setAttribute<T>(key: string, value: T): void;

	commitChanges(): void;
}

export type StoreFactory = (originalStore?: Store) => Store;

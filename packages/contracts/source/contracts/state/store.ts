import { Block, Commit, CommitHandler } from "../crypto/index.js";
import { JsonObject } from "../types/index.js";
import { WalletRepository } from "./wallets.js";

export interface Store extends CommitHandler {
	readonly walletRepository: WalletRepository;

	getGenesisCommit(): Commit;
	setGenesisCommit(block: Commit): void;

	getLastHeight(): number;
	getLastBlock(): Block;
	setLastBlock(block: Block): void;

	getTotalRound(): number;

	hasAttribute(key: string): boolean;
	getAttribute<T>(key: string): T;
	setAttribute<T>(key: string, value: T): void;

	commitChanges(): void;

	toJson(): JsonObject;
	fromJson(data: JsonObject): void;
}

export type StoreFactory = (originalStore?: Store) => Store;

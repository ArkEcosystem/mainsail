import { Block } from "../crypto";
import { Commit } from "../crypto/commit";
import { JsonObject } from "../types";
import { WalletRepository } from "./wallets";

export interface Store {
	readonly walletRepository: WalletRepository;

	isBootstrap(): boolean;
	setBootstrap(value: boolean): void;

	getGenesisCommit(): Commit;
	setGenesisCommit(block: Commit): void;

	getLastHeight(): number;
	getLastBlock(): Block;
	setLastBlock(block: Block): void;

	getTotalRound(): number;
	setTotalRound(totalRound: number): void;

	hasAttribute(key: string): boolean;
	getAttribute<T>(key: string): T;
	setAttribute<T>(key: string, value: T): void;

	commitChanges(): void;

	toJson(): JsonObject;
	fromJson(data: JsonObject): void;
}

export type StoreFactory = (originalStore?: Store) => Store;

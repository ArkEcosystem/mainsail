import { BigNumber } from "@mainsail/utils";
import { JsonObject } from "type-fest";

import { BlockData, MultiSignatureAsset } from "../crypto/index.js";
import { Repository, RepositoryChange } from "./repository.js";

// @TODO review all interfaces in here and document them properly. Remove ones that are no longer needed.

export interface WalletIndex {
	has(key: string): boolean;
	get(key: string): Wallet | undefined;
	set(key: string, wallet: Wallet): void;
	forget(key: string): void;
	entries(): ReadonlyArray<[string, Wallet]>;
	values(): ReadonlyArray<Wallet>;
	keys(): string[];
	size(): number;
	clear(): void;
}

export enum WalletIndexes {
	Addresses = "addresses",
	PublicKeys = "publicKeys",
	Usernames = "usernames",
	Resignations = "resignations",
	Validators = "validators",
}

export interface WalletChange extends RepositoryChange {
	address: string;
}

export interface Wallet extends Omit<Repository, "fromJson" | "commitChanges" | "changesToJson"> {
	// TODO: Use one form set / increase
	getAddress(): string;

	getPublicKey(): string | undefined;
	setPublicKey(publicKey: string): void;

	getBalance(): BigNumber;
	setBalance(balance: BigNumber): void;
	increaseBalance(balance: BigNumber): Wallet;
	decreaseBalance(balance: BigNumber): Wallet;

	getNonce(): BigNumber;
	setNonce(nonce: BigNumber): void;
	increaseNonce(): void;
	decreaseNonce(): void;

	isValidator(): boolean;
	hasVoted(): boolean;
	hasMultiSignature(): boolean;

	clone(walletRepository: WalletRepository): Wallet;
	getOriginal(): Wallet;

	fromJson(data: JsonObject): Wallet;
	commitChanges(walletRepository: WalletRepository): void;

	changesToJson(): WalletChange;

	toString(): string;
}

export interface ValidatorWallet {
	getWallet(): Wallet;
	getWalletPublicKey(): string;
	getConsensusPublicKey(): string;
	getVoteBalance(): BigNumber;
	getRank(): number;
	setRank(rank: number): void;
	unsetRank(): void;
	getApproval(): number;
	setApproval(approval: number): void;
	unsetApproval(): void;
	isResigned(): boolean;
	toString(): string;
}

export type WalletFactory = (address: string, walletRepository: WalletRepository) => Wallet;

export type ValidatorWalletFactory = (wallet: Wallet) => ValidatorWallet;

export interface WalletValidatorAttributes {
	username: string;
	voteBalance: BigNumber;
	rank?: number;
	lastBlock?: BlockData;
	round?: number;
	resigned?: boolean;
}

export type WalletMultiSignatureAttributes = MultiSignatureAsset & { legacy?: boolean };

export type WalletRepositoryChange = {
	wallets: WalletChange[];
	indexes: {
		[index: string]: {
			forgets: string[];
			sets: Record<string, string>;
		};
	};
};

export interface WalletRepository {
	allByAddress(): ReadonlyArray<Wallet>;
	allByPublicKey(): ReadonlyArray<Wallet>;
	allValidators(): ReadonlyArray<Wallet>;
	allByIndex(indexName: string): ReadonlyArray<Wallet>;

	findByAddress(address: string): Wallet;
	findByPublicKey(publicKey: string): Promise<Wallet>;
	findByUsername(username: string): Wallet;
	findByIndex(index: string, key: string): Wallet;

	hasByAddress(address: string): boolean;
	hasByPublicKey(publicKey: string): boolean;
	hasByUsername(username: string): boolean;
	hasByIndex(indexName: string, key: string): boolean;

	getIndex(name: string): WalletIndex;
	setOnIndex(index: string, key: string, wallet: Wallet): void;
	forgetOnIndex(index: string, key: string): void;
	sizeOfIndex(index: string): number;

	setDirtyWallet(wallet: Wallet): void;
	getDirtyWallets(): IterableIterator<Wallet>;

	commitChanges(): void;

	changesToJson(): WalletRepositoryChange;
}

export type WalletRepositoryFactory = (originalWalletRepository?: WalletRepository) => WalletRepository;
export type WalletRepositoryBySenderFactory = (
	originalWalletRepository: WalletRepository,
	publicKey: string,
) => Promise<WalletRepository>;

export enum SearchScope {
	Wallets,
	Validators,
	Locks,
	Entities,
}

export interface SearchContext<T = any> {
	query: Record<string, string[]>;
	entries: ReadonlyArray<T>;
	defaultOrder: string[];
}

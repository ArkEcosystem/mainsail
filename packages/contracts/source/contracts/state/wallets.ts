import { BigNumber } from "@mainsail/utils";
import { JsonObject } from "type-fest";

import { IBlockData, IMultiSignatureAsset } from "../crypto";

// @TODO review all interfaces in here and document them properly. Remove ones that are no longer needed.

export interface WalletIndex {
	has(key: string): boolean;
	get(key: string): Wallet | undefined;
	set(key: string, wallet: Wallet): void;
	forget(key: string): void;
	entries(): ReadonlyArray<[string, Wallet]>;
	values(): ReadonlyArray<Wallet>;
	keys(): string[];
	clear(): void;
}

export enum WalletIndexes {
	Addresses = "addresses",
	PublicKeys = "publicKeys",
	Usernames = "usernames",
	Resignations = "resignations",
	Locks = "locks",
}

export interface Wallet {
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

	hasAttribute(key: string): boolean;
	getAttribute<T = any>(key: string, defaultValue?: T): T;
	setAttribute<T = any>(key: string, value: T): boolean;
	forgetAttribute(key: string): boolean;
	getAttributes(): Record<string, any>;

	isChanged(): boolean;

	isValidator(): boolean;
	hasVoted(): boolean;
	hasMultiSignature(): boolean;

	clone(walletRepository: WalletRepository): Wallet;
	isClone(): boolean;
	getOriginal(): Wallet;

	commitChanges(walletRepository: WalletRepository): void;

	toJson(): JsonObject;
}

export interface IValidatorWallet {
	getWalletPublicKey(): string;
	getConsensusPublicKey(): string;
	getUsername(): string;
	getVoteBalance(): BigNumber;
	getRank(): number;
	setRank(rank: number): void;
	unsetRank(): void;
	isResigned(): boolean;
}

export type WalletFactory = (address: string, walletRepository: WalletRepository) => Wallet;

export type ValidatorWalletFactory = (wallet: Wallet) => IValidatorWallet;

export interface WalletValidatorAttributes {
	username: string;
	voteBalance: BigNumber;
	rank?: number;
	lastBlock?: IBlockData;
	round?: number;
	resigned?: boolean;
}

export type WalletMultiSignatureAttributes = IMultiSignatureAsset & { legacy?: boolean };

export interface WalletRepository {
	allByAddress(): ReadonlyArray<Wallet>;

	allByPublicKey(): ReadonlyArray<Wallet>;

	allByUsername(): ReadonlyArray<Wallet>;

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

	setDirtyWallet(wallet: Wallet): void;
}

export interface WalletRepositoryClone extends WalletRepository {
	getDirtyWallets(): IterableIterator<Wallet>;
	commitChanges(): void;
}

export type WalletRepositoryFactory = () => WalletRepository;
export type WalletRepositoryCloneFactory = (originalWalletRepository: WalletRepository) => WalletRepositoryClone;

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

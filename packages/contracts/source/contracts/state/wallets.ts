import { BigNumber } from "@mainsail/utils";

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

	getNonce(): BigNumber;

	setNonce(nonce: BigNumber): void;

	isChanged(): boolean;

	increaseBalance(balance: BigNumber): Wallet;

	decreaseBalance(balance: BigNumber): Wallet;

	increaseNonce(): void;

	decreaseNonce(): void;

	getAttributes(): Record<string, any>;

	getAttribute<T = any>(key: string, defaultValue?: T): T;

	setAttribute<T = any>(key: string, value: T): boolean;

	forgetAttribute(key: string): boolean;

	hasAttribute(key: string): boolean;

	isValidator(): boolean;

	hasVoted(): boolean;

	hasMultiSignature(): boolean;

	clone(walletRepository: WalletRepository): Wallet;

	isClone(): boolean;

	getOriginal(): Wallet;

	commitChanges(walletRepository: WalletRepository): void;
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

export type WalletFactory = (address: string) => Wallet;

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

	setChangedWallet(wallet: Wallet): void;
}

export interface WalletRepositoryClone extends WalletRepository {
	getDirtyWallets(): ReadonlyArray<Wallet>;
	commitChanges(): void;
}

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

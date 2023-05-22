import { BigNumber } from "@mainsail/utils";

import { IBlockData, IMultiSignatureAsset } from "../crypto";

// @TODO review all interfaces in here and document them properly. Remove ones that are no longer needed.

export interface WalletIndex {
	readonly indexer: WalletIndexer;
	readonly autoIndex: boolean;
	index(walletHolder: WalletHolder): void;
	has(key: string): boolean;
	get(key: string): WalletHolder | undefined;
	set(key: string, walletHolder: WalletHolder): void;
	forget(key: string): void;
	forgetWallet(walletHolder: WalletHolder): void;
	entries(): ReadonlyArray<[string, WalletHolder]>;
	values(): ReadonlyArray<WalletHolder>;
	keys(): string[];
	walletKeys(walletHolder: WalletHolder): string[];
	clear(): void;
}

export type WalletIndexer = (index: WalletIndex, walletHolder: WalletHolder) => void;

export type WalletIndexerIndex = { name: string; indexer: WalletIndexer; autoIndex: boolean };

export enum WalletIndexes {
	Addresses = "addresses",
	PublicKeys = "publicKeys",
	Usernames = "usernames",
	Resignations = "resignations",
	Locks = "locks",
}

export interface WalletData {
	address: string;
	publicKey?: string;
	balance: BigNumber;
	nonce: BigNumber;
	attributes: Record<string, any>;
}

export interface Wallet {
	getAddress(): string;

	getPublicKey(): string | undefined;

	setPublicKey(publicKey: string): void;

	getBalance(): BigNumber;

	setBalance(balance: BigNumber): void;

	getNonce(): BigNumber;

	setNonce(nonce: BigNumber): void;

	increaseBalance(balance: BigNumber): Wallet;

	decreaseBalance(balance: BigNumber): Wallet;

	increaseNonce(): void;

	decreaseNonce(): void;

	getData(): WalletData;

	getAttributes(): Record<string, any>;

	getAttribute<T = any>(key: string, defaultValue?: T): T;

	setAttribute<T = any>(key: string, value: T): boolean;

	forgetAttribute(key: string): boolean;

	hasAttribute(key: string): boolean;

	isValidator(): boolean;

	hasVoted(): boolean;

	hasMultiSignature(): boolean;

	clone(): Wallet;
}

export interface WalletHolder {
	getWallet(): Wallet;
	setWallet(wallet: Wallet): void;
}

export type WalletFactory = (address: string) => Wallet;

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
	reset(): void;

	has(key: string): boolean;

	allByAddress(): ReadonlyArray<Wallet>;

	allByPublicKey(): ReadonlyArray<Wallet>;

	allByUsername(): ReadonlyArray<Wallet>;

	allByIndex(indexName: string): ReadonlyArray<Wallet>;

	findByAddress(address: string): Wallet;

	findByPublicKey(publicKey: string): Promise<Wallet>;

	findByUsername(username: string): Wallet;

	findByIndex(index: string, key: string): Wallet;

	findByIndexes(indexes: string[], key: string): Wallet;

	hasByAddress(address: string): boolean;

	hasByPublicKey(publicKey: string): boolean;

	hasByUsername(username: string): boolean;

	hasByIndex(indexName: string, key: string): boolean;

	getIndex(name: string): WalletIndex;

	getIndexNames(): string[];

	index(wallet: Wallet): void;

	setOnIndex(index: string, key: string, wallet: Wallet): void;

	forgetOnIndex(index: string, key: string): void;

	cloneWallet(origin: WalletRepository, wallet: Wallet): WalletHolder;
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

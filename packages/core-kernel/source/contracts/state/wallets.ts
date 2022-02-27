import Interfaces from "@arkecosystem/core-crypto-contracts";
import { BigNumber } from "@arkecosystem/utils";

// todo: review all interfaces in here and document them properly. Remove ones that are no longer needed.

export interface WalletIndex {
	readonly indexer: WalletIndexer;
	readonly autoIndex: boolean;
	index(wallet: Wallet): void;
	has(key: string): boolean;
	get(key: string): Wallet | undefined;
	set(key: string, wallet: Wallet): void;
	forget(key: string): void;
	forgetWallet(wallet: Wallet): void;
	entries(): ReadonlyArray<[string, Wallet]>;
	values(): ReadonlyArray<Wallet>;
	keys(): string[];
	walletKeys(wallet: Wallet): string[];
	clear(): void;
}

export type WalletIndexer = (index: WalletIndex, wallet: Wallet) => void;

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

	isDelegate(): boolean;

	hasVoted(): boolean;

	hasMultiSignature(): boolean;

	clone(): Wallet;
}

export type WalletFactory = (address: string) => Wallet;

export interface WalletDelegateAttributes {
	username: string;
	voteBalance: BigNumber;
	forgedFees: BigNumber;
	forgedRewards: BigNumber;
	producedBlocks: number;
	rank?: number;
	lastBlock?: Interfaces.IBlockData;
	round?: number;
	resigned?: boolean;
}

export type WalletMultiSignatureAttributes = Interfaces.IMultiSignatureAsset & { legacy?: boolean };

export interface WalletRepository {
	// TODO: use an inversify factory for wallets instead?
	createWallet(address: string): Wallet;

	reset(): void;

	getIndex(name: string): WalletIndex;

	allByAddress(): ReadonlyArray<Wallet>;

	allByPublicKey(): ReadonlyArray<Wallet>;

	allByUsername(): ReadonlyArray<Wallet>;

	allByIndex(indexName: string): ReadonlyArray<Wallet>;

	findByAddress(address: string): Wallet;

	has(key: string): boolean;

	hasByIndex(indexName: string, key: string): boolean;

	getIndexNames(): string[];

	findByPublicKey(publicKey: string): Wallet;

	findByUsername(username: string): Wallet;

	findByIndex(index: string, key: string): Wallet;

	findByIndexes(indexes: string[], key: string): Wallet;

	getNonce(publicKey: string): BigNumber;

	index(wallet: Wallet): void;

	setOnIndex(index: string, key: string, wallet: Wallet): void;

	forgetOnIndex(index: string, key: string): void;

	hasByAddress(address: string): boolean;

	hasByPublicKey(publicKey: string): boolean;

	hasByUsername(username: string): boolean;

	cloneWallet(origin: WalletRepository, wallet: Wallet): Wallet;
}

export enum SearchScope {
	Wallets,
	Delegates,
	Locks,
	Entities,
}

export interface SearchContext<T = any> {
	query: Record<string, string[]>;
	entries: ReadonlyArray<T>;
	defaultOrder: string[];
}

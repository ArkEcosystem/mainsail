import { BigNumber } from "@mainsail/utils";

import { BlockData, MultiSignatureAsset } from "../crypto/index.js";
import { StateRepository } from "./repository.js";

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

export interface Wallet extends Omit<StateRepository, "commitChanges"> {
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

	getOriginal(): Wallet;
}

export interface ValidatorWallet {
	address: string;
	blsPublicKey: string;
	voteBalance: number;
}

export type WalletFactory = (address: string, walletRepository: WalletRepository, wallet?: Wallet) => Wallet;

export interface WalletValidatorAttributes {
	username: string;
	voteBalance: BigNumber;
	rank?: number;
	lastBlock?: BlockData;
	round?: number;
	resigned?: boolean;
}

export type WalletMultiSignatureAttributes = MultiSignatureAsset & { legacy?: boolean };

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

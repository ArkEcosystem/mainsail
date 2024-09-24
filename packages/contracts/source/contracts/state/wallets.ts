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

export interface WalletValidatorAttributes {
	username: string;
	voteBalance: BigNumber;
	rank?: number;
	lastBlock?: BlockData;
	round?: number;
	resigned?: boolean;
}

export type WalletMultiSignatureAttributes = MultiSignatureAsset & { legacy?: boolean };

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

import { BigNumber } from "@mainsail/utils";

import { BlockData, MultiSignatureAsset } from "../crypto/index.js";

export interface Wallet {
	getAddress(): string;

	getBalance(): BigNumber;
	setBalance(balance: BigNumber): void;
	increaseBalance(balance: BigNumber): Wallet;
	decreaseBalance(balance: BigNumber): Wallet;

	getNonce(): BigNumber;
	setNonce(nonce: BigNumber): void;
	increaseNonce(): void;
	decreaseNonce(): void;
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

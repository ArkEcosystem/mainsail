export interface Wallet {
	getAddress(): string;

	getBalance(): bigint;
	setBalance(balance: bigint): void;
	increaseBalance(balance: bigint): Wallet;
	decreaseBalance(balance: bigint): Wallet;

	getNonce(): bigint;
	setNonce(nonce: bigint): void;
	increaseNonce(): void;
	decreaseNonce(): void;

	// legacy
	getLegacyAddress(): string | undefined;
	hasLegacySecondPublicKey(): boolean;
	legacySecondPublicKey(): string;
}

export interface ValidatorWallet {
	address: string;
	blsPublicKey: string;
	voteBalance: bigint;
	votersCount: number;
	fee: bigint;
	isResigned: boolean;
}

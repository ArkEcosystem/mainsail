import type { Contracts } from "@mainsail/contracts";

export interface Context {
	app: Contracts.Kernel.Application;
	wallets: Contracts.Crypto.KeyPair[];
	fundedWalletProvider?: (
		context: { app: Contracts.Kernel.Application; wallets: Contracts.Crypto.KeyPair[] },
		amount?: bigint,
	) => Promise<Contracts.Crypto.KeyPair>;
}

export interface TransactionOptions {
	sender?: Contracts.Crypto.KeyPair;
	gasPrice?: number;
	signature?: string;
	nonceOffset?: number;

	callback?: (transaction: Contracts.Crypto.Transaction) => Promise<void>;
}

export interface TransferOptions extends TransactionOptions {
	recipient?: string;
	amount?: number | string | bigint;
}

export interface EvmCallOptions extends TransactionOptions {
	gasLimit?: number;
	payload?: string;
	recipient?: string;
	value?: string | number | bigint;
}

export interface ValidatorRegistrationOptions extends EvmCallOptions {
	validatorPublicKey?: string;
}

export type ValidatorResignationOptions = EvmCallOptions;

export interface VoteOptions extends EvmCallOptions {
	vote: string;
}

export type UnvoteOptions = EvmCallOptions;

export interface UsernameRegistrationOptions extends EvmCallOptions {
	username: string;
}

export type UsernameResignationOptions = EvmCallOptions;

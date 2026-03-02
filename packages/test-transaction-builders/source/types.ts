import type { Contracts } from "@mainsail/contracts";
import type { BigNumber } from "@mainsail/utils";

export interface Context {
	app: Contracts.Kernel.Application;
	wallets: Contracts.Crypto.KeyPair[];
	fundedWalletProvider?: (
		context: { app: Contracts.Kernel.Application; wallets: Contracts.Crypto.KeyPair[] },
		amount?: BigNumber,
	) => Promise<Contracts.Crypto.KeyPair>;
}

export interface TransactionOptions {
	sender?: Contracts.Crypto.KeyPair;
	gasPrice?: number;
	signature?: string;
	omitParticipantSignatures?: number[];
	nonceOffset?: number;
	multiSigKeys?: Contracts.Crypto.KeyPair[];
	participantSignatures?: string[];

	callback?: (transaction: Contracts.Crypto.Transaction) => Promise<void>;
}

export interface TransferOptions extends TransactionOptions {
	recipient?: string;
	amount?: number | string | BigNumber;
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

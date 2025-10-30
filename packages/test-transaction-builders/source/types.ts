import { Contracts } from "@mainsail/contracts";
import { Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";

export interface Context {
	sandbox: Sandbox;
	wallets: Contracts.Crypto.KeyPair[];
	fundedWalletProvider?: (
		context: { sandbox: Sandbox; wallets: Contracts.Crypto.KeyPair[] },
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

export interface UsernameRegistrationOptions extends TransactionOptions {
	username?: string;
}

export type UsernameResignationOptions = TransactionOptions;

export interface MultiSignatureOptions extends TransactionOptions {
	participants: Contracts.Crypto.KeyPair[];
	min?: number;
	participantSignatureOverwrite?: { [index: number]: string };
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

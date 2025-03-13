import { Contracts } from "@mainsail/contracts";
import { Sandbox } from "@mainsail/test-framework";
import { BigNumber } from "@mainsail/utils";
import { BigNumberish } from "ethers";

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

export interface VoteOptions extends TransactionOptions {
	voteAsset?: string;
	unvoteAsset?: string;
}

export interface ValidatorRegistrationOptions extends TransactionOptions {
	validatorPublicKey?: string;
}

export type ValidatorResignationOptions = TransactionOptions;

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
	value?: BigNumberish;
}

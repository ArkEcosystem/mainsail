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
	fee?: number | string | BigNumber;
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

export interface ValidatorResignationOptions extends TransactionOptions {}

export interface UsernameRegistrationOptions extends TransactionOptions {
	username?: string;
}

export interface UsernameResignationOptions extends TransactionOptions {}

export interface MultiPaymentOptions extends TransactionOptions {
	payments?: Contracts.Crypto.MultiPaymentItem[];
}

export interface MultiSignatureOptions extends TransactionOptions {
	participants: Contracts.Crypto.KeyPair[];
	min?: number;
	participantSignatureOverwrite?: { [index: number]: string };
}

export interface EvmCallOptions extends TransactionOptions {
	gasLimit?: number;
	payload?: string;
}

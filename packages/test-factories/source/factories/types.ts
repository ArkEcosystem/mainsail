import type { Contracts } from "@mainsail/contracts";

export type FactoryFunctionOptions = Record<string, unknown>;

export type FactoryFunction<
	TEntity = unknown,
	TResult = unknown,
	TOptions extends FactoryFunctionOptions = FactoryFunctionOptions,
> = (parameters: { entity?: TEntity; options: TOptions }) => Promise<TResult>;

export type HookFunction<
	TEntity = unknown,
	TOptions extends FactoryFunctionOptions = FactoryFunctionOptions,
> = (parameters: { entity?: TEntity; options: TOptions }) => void;

export type TransactionOptions = {
	nonce?: string;
	gasPrice?: number;
	timestamp?: number;
	recipientAddress?: string;
	senderAddress?: string;
	passphrase?: string;
	passphrases?: string[];
};

export type TransferOptions = TransactionOptions & {
	amount?: string;
	recipientId?: string;
};

export type ValidatorRegistrationOptions = TransactionOptions & {
	username?: string;
	publicKey?: string;
};

export type ValidatorResignationOptions = TransactionOptions & {};

export type VoteOptions = TransactionOptions & {
	publicKey?: string;
};

export type MultiSignatureOptions = TransactionOptions & {
	publicKeys?: string[];
	min?: number;
};

export type MultiPaymentOptions = TransactionOptions & {
	payments?: {
		amount: string;
		recipientId: string;
	}[];
};

export type EvmCallOptions = TransactionOptions & {
	evmCall?: {
		payload: string;
		gasLimit: number;
	};
};

export interface Identity {
	keys: Contracts.Crypto.KeyPair;
	publicKey: string;
	privateKey: string;
	address: string;
	wif: string;
	passphrase: string;
	secondPassphrase?: string;
}

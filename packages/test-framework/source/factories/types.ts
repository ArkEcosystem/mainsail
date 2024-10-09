import { Contracts } from "@mainsail/contracts";

export type FactoryFunctionOptions = Record<string, any>;

export type FactoryFunction = ({ entity, options }: { entity?: any; options: FactoryFunctionOptions }) => Promise<any>;

export type HookFunction = ({ entity, options }: { entity?: any; options: FactoryFunctionOptions }) => void;

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
	vendorField?: string;
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

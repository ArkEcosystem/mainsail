export type FactoryFunctionOptions = Record<string, any>;

export type FactoryFunction = ({ entity, options }: { entity?: any; options: FactoryFunctionOptions }) => Promise<any>;

export type HookFunction = ({ entity, options }: { entity?: any; options: FactoryFunctionOptions }) => void;

export type TransactionOptions = {
	version?: number;
	nonce?: string;
	fee?: string;
	timestamp?: number;
	senderPublicKey?: string;
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

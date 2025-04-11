import { Contracts } from "@mainsail/contracts";

export type EqualCriteria<T> = T;
export type NumericCriteria<T> = T | { from: T } | { to: T } | { from: T; to: T };
export type LikeCriteria<T> = T;
export type ContainsCriteria<T> = T;

export type OrCriteria<TCriteria> = TCriteria | TCriteria[];

export type OrEqualCriteria<T> = OrCriteria<EqualCriteria<T>>;
export type OrNumericCriteria<T> = OrCriteria<NumericCriteria<T>>;
export type OrLikeCriteria<T> = OrCriteria<LikeCriteria<T>>;
export type OrContainsCriteria<T> = OrCriteria<ContainsCriteria<T>>;

export type BlockCriteria = {
	hash?: OrEqualCriteria<string>;
	version?: OrEqualCriteria<number>;
	timestamp?: OrNumericCriteria<number>;
	parentHash?: OrEqualCriteria<string>;
	number?: OrNumericCriteria<number | string>;
	round?: OrEqualCriteria<number>;
	transactionsCount?: OrNumericCriteria<number>;
	amount?: OrNumericCriteria<number | string>;
	fee?: OrNumericCriteria<number | string>;
	reward?: OrNumericCriteria<number | string>;
	payloadSize?: OrNumericCriteria<number>;
	transactionsRoot?: OrEqualCriteria<string>;
	proposer?: OrEqualCriteria<string>;
};

export type OrBlockCriteria = OrCriteria<BlockCriteria>;

export type BlockDataWithTransactionData = {
	data: Contracts.Crypto.BlockData;
	transactions: Contracts.Crypto.TransactionData[];
};

export type TransactionCriteria = {
	address?: OrEqualCriteria<string>;
	senderId?: OrEqualCriteria<string>;
	to?: OrEqualCriteria<string>;
	hash?: OrEqualCriteria<string>;
	version?: OrEqualCriteria<number>;
	blockHash?: OrEqualCriteria<string>;
	transactionIndex?: OrNumericCriteria<number>;
	timestamp?: OrNumericCriteria<number>;
	nonce?: OrNumericCriteria<string>;
	senderPublicKey?: OrEqualCriteria<string>;
	from?: OrEqualCriteria<string>;
	value?: OrNumericCriteria<string>;
	gasPrice?: OrNumericCriteria<number>;
	data?: OrEqualCriteria<string>;
};

export type OrTransactionCriteria = OrCriteria<TransactionCriteria>;

export type WalletCriteria = {
	address?: OrEqualCriteria<string>;
	publicKey?: OrEqualCriteria<string>;
	balance?: OrNumericCriteria<string>;
	nonce?: OrNumericCriteria<string>;
	attributes?: OrContainsCriteria<Record<string, any>>;
};

export type OrWalletCriteria = OrCriteria<WalletCriteria>;

export type ValidatorResourceLastBlock = {
	hash?: OrEqualCriteria<string>;
	number?: OrNumericCriteria<number>;
};

export type ValidatorForged = {
	fees?: OrNumericCriteria<string>;
	rewards?: OrNumericCriteria<string>;
	total?: OrNumericCriteria<string>;
};

export type ValidatorProduction = {
	approval?: OrNumericCriteria<number>;
};

export type ValidatorBlocks = {
	produced?: OrNumericCriteria<number>;
	last?: ValidatorResourceLastBlock;
};

export type ValidatorCriteria = {
	address?: OrEqualCriteria<string>;
	publicKey?: OrEqualCriteria<string>;
	balance?: OrNumericCriteria<string>;
	nonce?: OrNumericCriteria<string>;
	votes?: OrEqualCriteria<string>;
	rank?: OrEqualCriteria<number>;
	isResigned?: OrEqualCriteria<boolean>;

	forged?: ValidatorForged;
	production?: ValidatorProduction;
	blocks?: ValidatorBlocks;

	attributes?: OrContainsCriteria<Record<string, any>>;
};

export type OrValidatorCriteria = OrCriteria<ValidatorCriteria>;

export type PeerCriteria = {
	ip?: OrEqualCriteria<string>;
	version?: OrNumericCriteria<string>;
};

export type OrPeerCriteria = OrCriteria<PeerCriteria>;

export type ApiNodeCriteria = {
	url?: OrEqualCriteria<string>;
	version?: OrNumericCriteria<string>;
};

export type OrApiNodeCriteria = OrCriteria<ApiNodeCriteria>;

export type ReceiptCriteria = {
	transactionHash?: OrEqualCriteria<string>;
	from?: OrEqualCriteria<string>;
	to?: OrEqualCriteria<string>;
};

export type OrReceiptCriteria = OrCriteria<ReceiptCriteria>;

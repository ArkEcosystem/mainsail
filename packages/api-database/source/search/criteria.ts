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
	id?: OrEqualCriteria<string>;
	version?: OrEqualCriteria<number>;
	timestamp?: OrNumericCriteria<number>;
	previousBlock?: OrEqualCriteria<string>;
	height?: OrNumericCriteria<number | string>;
	numberOfTransactions?: OrNumericCriteria<number>;
	totalAmount?: OrNumericCriteria<number | string>;
	totalFee?: OrNumericCriteria<number | string>;
	reward?: OrNumericCriteria<number | string>;
	payloadLength?: OrNumericCriteria<number>;
	payloadHash?: OrEqualCriteria<string>;
	generatorPublicKey?: OrEqualCriteria<string>;
};

export type OrBlockCriteria = OrCriteria<BlockCriteria>;

export type BlockDataWithTransactionData = {
	data: Contracts.Crypto.BlockData;
	transactions: Contracts.Crypto.TransactionData[];
};

export type TransactionCriteria = {
	address?: OrEqualCriteria<string>;
	senderId?: OrEqualCriteria<string>;
	recipientId?: OrEqualCriteria<string>;
	id?: OrEqualCriteria<string>;
	version?: OrEqualCriteria<number>;
	blockId?: OrEqualCriteria<string>;
	sequence?: OrNumericCriteria<number>;
	timestamp?: OrNumericCriteria<number>;
	nonce?: OrNumericCriteria<string>;
	senderPublicKey?: OrEqualCriteria<string>;
	type?: OrEqualCriteria<number>;
	typeGroup?: OrEqualCriteria<number>;
	vendorField?: OrLikeCriteria<string>;
	amount?: OrNumericCriteria<string>;
	fee?: OrNumericCriteria<string>;
	asset?: OrContainsCriteria<Record<string, any>>;
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

export type DelegateResourceLastBlock = {
	id?: OrEqualCriteria<string>;
	height?: OrNumericCriteria<number>;
};

export type DelegateForged = {
	fees?: OrNumericCriteria<string>;
	rewards?: OrNumericCriteria<string>;
	total?: OrNumericCriteria<string>;
};

export type DelegateProduction = {
	approval?: OrNumericCriteria<number>;
};

export type DelegateBlocks = {
	produced?: OrNumericCriteria<number>;
	last?: DelegateResourceLastBlock;
};

export type DelegateCriteria = {
	address?: OrEqualCriteria<string>;
	publicKey?: OrEqualCriteria<string>;
	balance?: OrNumericCriteria<string>;
	nonce?: OrNumericCriteria<string>;
	votes?: OrEqualCriteria<string>;
	rank?: OrEqualCriteria<number>;
	isResigned?: OrEqualCriteria<boolean>;

	forged?: DelegateForged;
	production?: DelegateProduction;
	blocks?: DelegateBlocks;
};

export type OrDelegateCriteria = OrCriteria<DelegateCriteria>;

export type PeerCriteria = {
	ip?: OrEqualCriteria<string>;
	version?: OrNumericCriteria<string>;
};

export type OrPeerCriteria = OrCriteria<PeerCriteria>;

export type ApiNodeCriteria = {
	ip?: OrEqualCriteria<string>;
	version?: OrNumericCriteria<string>;
};

export type OrApiNodeCriteria = OrCriteria<ApiNodeCriteria>;

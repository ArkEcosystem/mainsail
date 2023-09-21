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
	data: Contracts.Crypto.IBlockData;
	transactions: Contracts.Crypto.ITransactionData[];
};

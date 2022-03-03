import { BigNumber } from "@arkecosystem/utils";

import { IBlockData, ITransactionData } from "../crypto";
import { Options, OrCriteria, OrEqualCriteria, OrNumericCriteria, Pagination, ResultsPage, Sorting } from "../search";
import { OrTransactionCriteria } from "./transaction-history-service";

export type BlockCriteria = {
	id?: OrEqualCriteria<string>;
	version?: OrEqualCriteria<number>;
	timestamp?: OrNumericCriteria<number>;
	previousBlock?: OrEqualCriteria<string>;
	height?: OrNumericCriteria<number>;
	numberOfTransactions?: OrNumericCriteria<number>;
	totalAmount?: OrNumericCriteria<BigNumber>;
	totalFee?: OrNumericCriteria<BigNumber>;
	reward?: OrNumericCriteria<BigNumber>;
	payloadLength?: OrNumericCriteria<number>;
	payloadHash?: OrEqualCriteria<string>;
	generatorPublicKey?: OrEqualCriteria<string>;
	blockSignature?: OrEqualCriteria<string>;
};

export type OrBlockCriteria = OrCriteria<BlockCriteria>;

export type BlockDataWithTransactionData = {
	data: IBlockData;
	transactions: ITransactionData[];
};

export interface BlockHistoryService {
	findOneByCriteria(criteria: OrBlockCriteria): Promise<IBlockData | undefined>;

	findManyByCriteria(criteria: OrBlockCriteria): Promise<IBlockData[]>;

	listByCriteria(
		criteria: OrBlockCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<IBlockData>>;

	findOneByCriteriaJoinTransactions(
		blockCriteria: OrBlockCriteria,
		transactionCriteria: OrTransactionCriteria,
	): Promise<BlockDataWithTransactionData | undefined>;

	findManyByCriteriaJoinTransactions(
		blockCriteria: OrBlockCriteria,
		transactionCriteria: OrTransactionCriteria,
	): Promise<BlockDataWithTransactionData[]>;

	listByCriteriaJoinTransactions(
		blockCriteria: OrBlockCriteria,
		transactionCriteria: OrTransactionCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<BlockDataWithTransactionData>>;
}

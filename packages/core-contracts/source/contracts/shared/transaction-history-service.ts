import { BigNumber } from "@arkecosystem/utils";

import { IBlockData, ITransactionData } from "../crypto";
import {
	Options,
	OrContainsCriteria,
	OrCriteria,
	OrEqualCriteria,
	OrLikeCriteria,
	OrNumericCriteria,
	Pagination,
	ResultsPage,
	Sorting,
} from "../search";

export type TransactionCriteria = {
	address?: OrEqualCriteria<string>;
	senderId?: OrEqualCriteria<string>;
	recipientId?: OrEqualCriteria<string>;
	id?: OrEqualCriteria<string>;
	version?: OrEqualCriteria<number>;
	blockId?: OrEqualCriteria<string>;
	sequence?: OrNumericCriteria<number>;
	timestamp?: OrNumericCriteria<number>;
	nonce?: OrNumericCriteria<BigNumber>;
	senderPublicKey?: OrEqualCriteria<string>;
	type?: OrEqualCriteria<number>;
	typeGroup?: OrEqualCriteria<number>;
	vendorField?: OrLikeCriteria<string>;
	amount?: OrNumericCriteria<BigNumber>;
	fee?: OrNumericCriteria<BigNumber>;
	asset?: OrContainsCriteria<Record<string, any>>;
};

export type OrTransactionCriteria = OrCriteria<TransactionCriteria>;

export type TransactionDataWithBlockData = {
	data: ITransactionData;
	block: IBlockData;
};

export interface TransactionHistoryService {
	findOneByCriteria(criteria: OrTransactionCriteria): Promise<ITransactionData | undefined>;

	findManyByCriteria(criteria: OrTransactionCriteria): Promise<ITransactionData[]>;

	streamByCriteria(criteria: OrTransactionCriteria): AsyncIterable<ITransactionData>;

	listByCriteria(
		criteria: OrTransactionCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<ITransactionData>>;

	findOneByCriteriaJoinBlock(criteria: OrTransactionCriteria): Promise<TransactionDataWithBlockData | undefined>;

	findManyByCriteriaJoinBlock(criteria: OrTransactionCriteria): Promise<TransactionDataWithBlockData[]>;

	listByCriteriaJoinBlock(
		criteria: OrTransactionCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<TransactionDataWithBlockData>>;
}

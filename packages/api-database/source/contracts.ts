import { type DataSource, EntityManager } from "typeorm";

import { MempoolTransaction, State } from "./models";
import { Block } from "./models/block";
import { Peer } from "./models/peer";
import { Transaction } from "./models/transaction";
import { TransactionType } from "./models/transaction-type";
import { ValidatorRound } from "./models/validator-round";
import { Wallet } from "./models/wallet";
import { ExtendedRepository } from "./repositories/repository-extension";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "./search";

export type RepositoryDataSource = DataSource | EntityManager;

export type IBlockRepositoryExtension = {
	getLatest(): Promise<Block | null>;
	getLatestHeight(): Promise<number | undefined>;

	findOneByCriteria(blockCriteria: Criteria.OrBlockCriteria): Promise<Block | undefined>;

	findManyByCriteria(
		blockCriteria: Criteria.OrBlockCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Block>>;
};

export type IBlockRepository = ExtendedRepository<Block> & IBlockRepositoryExtension;

export type IPeerRepositoryExtension = {
	getMedianPeerHeight(): Promise<number>;
};

export type IPeerRepository = ExtendedRepository<Peer> & IPeerRepositoryExtension;
export type IMempoolTransactionRepositoryExtension = {};
export type IMempoolTransactionRepository = ExtendedRepository<MempoolTransaction> &
	IMempoolTransactionRepositoryExtension;

export type ITransactionTypeRepositoryExtension = {};
export type ITransactionTypeRepository = ExtendedRepository<TransactionType> & ITransactionTypeRepositoryExtension;

export type FeeStatistics = {
	type: number;
	typeGroup: number;
	avg: string;
	min: string;
	max: string;
	sum: string;
};

export type ITransactionRepositoryExtension = {
	findManyByCritera(
		walletRepository: IWalletRepository,
		transactionCriteria: Criteria.OrTransactionCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Transaction>>;

	getFeeStatistics(
		days?: number,
		minFee?: number
	): Promise<FeeStatistics[]>;
};
export type ITransactionRepository = ExtendedRepository<Transaction> & ITransactionRepositoryExtension;

export type IValidatorRoundRepositoryExtension = {};
export type IValidatorRoundRepository = ExtendedRepository<ValidatorRound> & IValidatorRoundRepositoryExtension;
export type IStateRepositoryExtension = {};
export type IStateRepository = ExtendedRepository<State> & IStateRepositoryExtension;

export type IWalletRepositoryExtension = {
	findManyByCritera(
		transactionCriteria: Criteria.OrWalletCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Wallet>>;
};
export type IWalletRepository = ExtendedRepository<Wallet> & IWalletRepositoryExtension;

export type IBlockRepositoryFactory = (customDataSource?: RepositoryDataSource) => IBlockRepository;
export type IPeerRepositoryFactory = (customDataSource?: RepositoryDataSource) => IPeerRepository;
export type ITransactionRepositoryFactory = (customDataSource?: RepositoryDataSource) => ITransactionRepository;
export type ITransactionTypeRepositoryFactory = (customDataSource?: RepositoryDataSource) => ITransactionTypeRepository;
export type IMempoolTransactionRepositoryFactory = (
	customDataSource?: RepositoryDataSource,
) => IMempoolTransactionRepository;
export type IValidatorRoundRepositoryFactory = (customDataSource?: RepositoryDataSource) => IValidatorRoundRepository;
export type IStateRepositoryFactory = (customDataSource?: RepositoryDataSource) => IStateRepository;
export type IWalletRepositoryFactory = (customDataSource?: RepositoryDataSource) => IWalletRepository;

export { Entity, Repository } from "typeorm";
export { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

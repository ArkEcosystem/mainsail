import { type DataSource, EntityManager } from "typeorm";

import { MempoolTransaction, State } from "./models";
import { Block } from "./models/block";
import { Peer } from "./models/peer";
import { Transaction } from "./models/transaction";
import { ValidatorRound } from "./models/validator-round";
import { Wallet } from "./models/wallet";
// import { BlockFilter } from "./search/filters/block-filter";
import { ExtendedRepository } from "./repositories/repository-extension";
import { Criteria, Options, Pagination, ResultsPage, Sorting } from "./search";

export type RepositoryDataSource = DataSource | EntityManager;

export type IBlockRepositoryExtension = {
	getLatest(): Promise<Block | null>;
	getLatestHeight(): Promise<number | undefined>;

	findOneByCriteriaJoinTransactions(
		transactionRepository: ITransactionRepository,
		blockCriteria: Criteria.OrBlockCriteria,
		// transactionCriteria: Search.Criteria.OrTransactionCriteria,
	): Promise<Block | undefined>;

	findManyByCriteriaJoinTransactions(
		transactionRepository: ITransactionRepository,
		blockCriteria: Criteria.OrBlockCriteria,
	): Promise<Block[]>;

	//getFilter(): BlockFilter;
};
export type IBlockRepository = ExtendedRepository<Block> & IBlockRepositoryExtension;

export type IPeerRepositoryExtension = {};
export type IPeerRepository = ExtendedRepository<Peer> & IPeerRepositoryExtension;
export type IMempoolTransactionRepositoryExtension = {};
export type IMempoolTransactionRepository = ExtendedRepository<MempoolTransaction> &
	IMempoolTransactionRepositoryExtension;

export type ITransactionRepositoryExtension = {
	findManyByCritera(
		transactionCriteria: Criteria.OrTransactionCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Transaction>>
};
export type ITransactionRepository = ExtendedRepository<Transaction> & ITransactionRepositoryExtension;

export type IValidatorRoundRepositoryExtension = {};
export type IValidatorRoundRepository = ExtendedRepository<ValidatorRound> & IValidatorRoundRepositoryExtension;
export type IStateRepositoryExtension = {};
export type IStateRepository = ExtendedRepository<State> & IStateRepositoryExtension;
export type IWalletRepositoryExtension = {};
export type IWalletRepository = ExtendedRepository<Wallet> & IWalletRepositoryExtension;

export type IBlockRepositoryFactory = (customDataSource?: RepositoryDataSource) => IBlockRepository;
export type IPeerRepositoryFactory = (customDataSource?: RepositoryDataSource) => IPeerRepository;
export type ITransactionRepositoryFactory = (customDataSource?: RepositoryDataSource) => ITransactionRepository;
export type IMempoolTransactionRepositoryFactory = (
	customDataSource?: RepositoryDataSource,
) => IMempoolTransactionRepository;
export type IValidatorRoundRepositoryFactory = (customDataSource?: RepositoryDataSource) => IValidatorRoundRepository;
export type IStateRepositoryFactory = (customDataSource?: RepositoryDataSource) => IStateRepository;
export type IWalletRepositoryFactory = (customDataSource?: RepositoryDataSource) => IWalletRepository;

export { Entity, Repository } from "typeorm";
export { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

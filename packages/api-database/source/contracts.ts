import { type DataSource, EntityManager, ObjectLiteral, Repository, SelectQueryBuilder } from "typeorm";

import {
	ApiNode,
	Block,
	Configuration,
	Contract,
	LegacyColdWallet,
	Peer,
	Plugin,
	Receipt,
	State,
	Transaction,
	TransactionType,
	ValidatorRound,
	Wallet,
} from "./models/index.js";
import { QueryHelper } from "./search/query-helper.js";
import { Expression } from "./search/types/expressions.js";
import type { Criteria, Options, Pagination, ResultsPage, Sorting } from "./search/types/index.js";

export type RepositoryDataSource = DataSource | EntityManager;

export type BlockRepositoryExtension = {
	getLatest(): Promise<Block | null>;
	getLatestHeight(): Promise<number | undefined>;

	findOneByCriteria(blockCriteria: Criteria.OrBlockCriteria): Promise<Block | null>;

	findManyByCriteria(
		blockCriteria: Criteria.OrBlockCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Block>>;
};

export type BlockRepository = ExtendedRepository<Block> & BlockRepositoryExtension;

export type ConfigurationRepositoryExtension = Record<string, any>;
export type ConfigurationRepository = ExtendedRepository<Configuration> & ConfigurationRepositoryExtension;

export type ContractRepositoryExtension = Record<string, any>;
export type ContractRepository = ExtendedRepository<Contract> & ContractRepositoryExtension;

export type ApiNodeRepositoryExtension = {
	findManyByCriteria(
		apiNodeCriteria: Criteria.OrApiNodeCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<ApiNode>>;
};

export type ApiNodeRepository = ExtendedRepository<ApiNode> & ApiNodeRepositoryExtension;

export type PeerRepositoryExtension = {
	getMedianPeerHeight(): Promise<number>;

	findManyByCriteria(
		peerCriteria: Criteria.OrPeerCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Peer>>;
};

export type PeerRepository = ExtendedRepository<Peer> & PeerRepositoryExtension;

export type TransactionTypeRepositoryExtension = Record<string, any>;
export type TransactionTypeRepository = ExtendedRepository<TransactionType> & TransactionTypeRepositoryExtension;

export type FeeStatistics = {
	avg: string;
	min: string;
	max: string;
	sum: string;
};

export type TransactionRepositoryExtension = {
	findManyByCriteria(
		walletRepository: WalletRepository,
		transactionCriteria: Criteria.OrTransactionCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Transaction>>;

	getFeeStatistics(genesisTimestamp: number, days?: number, minFee?: number): Promise<FeeStatistics | undefined>;
};
export type TransactionRepository = ExtendedRepository<Transaction> & TransactionRepositoryExtension;

export type LegacyColdWalletRepositoryExtension = Record<string, any>;
export type LegacyColdWalletRepository = ExtendedRepository<LegacyColdWallet> & LegacyColdWalletRepositoryExtension;
export type ValidatorRoundRepositoryExtension = Record<string, any>;
export type ValidatorRoundRepository = ExtendedRepository<ValidatorRound> & ValidatorRoundRepositoryExtension;
export type PluginRepositoryExtension = Record<string, any>;
export type PluginRepository = ExtendedRepository<Plugin> & PluginRepositoryExtension;
export type ReceiptRepositoryExtension = {
	findManyByCriteria(
		criteria: Criteria.OrReceiptCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Receipt>>;
};
export type ReceiptRepository = ExtendedRepository<Receipt> & ReceiptRepositoryExtension;
export type StateRepositoryExtension = Record<string, any>;
export type StateRepository = ExtendedRepository<State> & StateRepositoryExtension;

export type WalletRepositoryExtension = {
	findManyByCriteria(
		walletCriteria: Criteria.OrWalletCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Wallet>>;

	findManyDelegatesByCritera(
		delegateCriteria: Criteria.OrDelegateCriteria,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<Wallet>>;
};
export type WalletRepository = ExtendedRepository<Wallet> & WalletRepositoryExtension;

export type ApiNodeRepositoryFactory = (customDataSource?: RepositoryDataSource) => ApiNodeRepository;
export type BlockRepositoryFactory = (customDataSource?: RepositoryDataSource) => BlockRepository;
export type ConfigurationRepositoryFactory = (customDataSource?: RepositoryDataSource) => ConfigurationRepository;
export type ContractRepositoryFactory = (customDataSource?: RepositoryDataSource) => ContractRepository;
export type PeerRepositoryFactory = (customDataSource?: RepositoryDataSource) => PeerRepository;
export type ReceiptRepositoryFactory = (customDataSource?: RepositoryDataSource) => ReceiptRepository;
export type TransactionRepositoryFactory = (customDataSource?: RepositoryDataSource) => TransactionRepository;
export type TransactionTypeRepositoryFactory = (customDataSource?: RepositoryDataSource) => TransactionTypeRepository;
export type ValidatorRoundRepositoryFactory = (customDataSource?: RepositoryDataSource) => ValidatorRoundRepository;
export type PluginRepositoryFactory = (customDataSource?: RepositoryDataSource) => PluginRepository;
export type StateRepositoryFactory = (customDataSource?: RepositoryDataSource) => StateRepository;
export type WalletRepositoryFactory = (customDataSource?: RepositoryDataSource) => WalletRepository;
export type LegacyColdWalletRepositoryFactory = (customDataSource?: RepositoryDataSource) => LegacyColdWalletRepository;

export { Brackets, Entity, Repository } from "typeorm";
export { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions.js";

export interface Migrations {
	run(): Promise<void>;
}

export interface RepositoryExtension<TEntity extends ObjectLiteral> {
	queryHelper: QueryHelper<TEntity>;

	addWhere(queryBuilder: SelectQueryBuilder<TEntity>, expression: Expression<TEntity>): void;

	addOrderBy(queryBuilder: SelectQueryBuilder<TEntity>, sorting: Sorting): void;

	addSkipOffset(queryBuilder: SelectQueryBuilder<TEntity>, pagination: Pagination): void;

	findManyByExpression(expression: Expression<TEntity>, sorting?: Sorting): Promise<TEntity[]>;

	listByExpression(
		expression: Expression<TEntity>,
		sorting: Sorting,
		pagination: Pagination,
		options?: Options,
	): Promise<ResultsPage<TEntity>>;
}

export type ExtendedRepository<TEntity extends ObjectLiteral> = RepositoryExtension<TEntity> & Repository<TEntity>;
export type ThisRepositoryExtension<TEntity extends ObjectLiteral> = ThisType<ExtendedRepository<TEntity>>;

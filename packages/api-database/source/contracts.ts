import { type DataSource, EntityManager } from "typeorm";

import {
	ApiNode,
	Block,
	Configuration,
	Peer,
	Plugin,
	Receipt,
	State,
	Transaction,
	TransactionType,
	ValidatorRound,
	Wallet,
} from "./models/index.js";
import type { ExtendedRepository } from "./repositories/repository-extension.js";
import type { Criteria, Options, Pagination, ResultsPage, Sorting } from "./search/index.js";

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

export type ConfigurationRepositoryExtension = {};
export type ConfigurationRepository = ExtendedRepository<Configuration> & ConfigurationRepositoryExtension;

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

export type TransactionTypeRepositoryExtension = {};
export type TransactionTypeRepository = ExtendedRepository<TransactionType> & TransactionTypeRepositoryExtension;

export type FeeStatistics = {
	type: number;
	typeGroup: number;
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

	getFeeStatistics(genesisTimestamp: number, days?: number, minFee?: number): Promise<FeeStatistics[]>;
};
export type TransactionRepository = ExtendedRepository<Transaction> & TransactionRepositoryExtension;

export type ValidatorRoundRepositoryExtension = {};
export type ValidatorRoundRepository = ExtendedRepository<ValidatorRound> & ValidatorRoundRepositoryExtension;
export type PluginRepositoryExtension = {};
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
export type StateRepositoryExtension = {};
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
export type PeerRepositoryFactory = (customDataSource?: RepositoryDataSource) => PeerRepository;
export type ReceiptRepositoryFactory = (customDataSource?: RepositoryDataSource) => ReceiptRepository;
export type TransactionRepositoryFactory = (customDataSource?: RepositoryDataSource) => TransactionRepository;
export type TransactionTypeRepositoryFactory = (customDataSource?: RepositoryDataSource) => TransactionTypeRepository;
export type ValidatorRoundRepositoryFactory = (customDataSource?: RepositoryDataSource) => ValidatorRoundRepository;
export type PluginRepositoryFactory = (customDataSource?: RepositoryDataSource) => PluginRepository;
export type StateRepositoryFactory = (customDataSource?: RepositoryDataSource) => StateRepository;
export type WalletRepositoryFactory = (customDataSource?: RepositoryDataSource) => WalletRepository;

export { Brackets, Entity, Repository } from "typeorm";
export { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions.js";

export interface Migrations {
	run(): Promise<void>;
}

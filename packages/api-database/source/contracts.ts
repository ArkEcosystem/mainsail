import { type DataSource, EntityManager } from "typeorm";

import { MempoolTransaction, State } from "./models";
import { Block } from "./models/block";
import { Peer } from "./models/peer";
import { Transaction } from "./models/transaction";
import { ValidatorRound } from "./models/validator-round";
import { Wallet } from "./models/wallet";
// import { BlockFilter } from "./search/filters/block-filter";
import { ExtendedRepository } from "./repositories/repository-extension";

export type RepositoryDataSource = DataSource | EntityManager;

export type IBlockRepositoryExtension = {
	getLatest(): Promise<Block | null>;
	getLatestHeight(): Promise<number | undefined>;
	//getFilter(): BlockFilter;
};
export type IBlockRepository = ExtendedRepository<Block> & IBlockRepositoryExtension;

export type IPeerRepositoryExtension = {};
export type IPeerRepository = ExtendedRepository<Peer> & IPeerRepositoryExtension;
export type IMempoolTransactionRepositoryExtension = {};
export type IMempoolTransactionRepository = ExtendedRepository<MempoolTransaction> & IMempoolTransactionRepositoryExtension;
export type ITransactionRepositoryExtension = {};
export type ITransactionRepository = ExtendedRepository<Transaction> & ITransactionRepositoryExtension;
export type IValidatorRoundRepositoryExtension = {};
export type IValidatorRoundRepository = ExtendedRepository<ValidatorRound> & IValidatorRoundRepositoryExtension;
export type IStateRepositoryExtension = {};
export type IStateRepository = ExtendedRepository<State> & IStateRepositoryExtension;
export type IWalletRepositoryExtension = {};
export type IWalletRepository = ExtendedRepository<Wallet> & IWalletRepositoryExtension;

export type IBlockRepositoryFactory = (dataSource: RepositoryDataSource) => IBlockRepository;
export type IPeerRepositoryFactory = (dataSource: RepositoryDataSource) => IPeerRepository;
export type ITransactionRepositoryFactory = (dataSource: RepositoryDataSource) => ITransactionRepository;
export type IMempoolTransactionRepositoryFactory = (dataSource: RepositoryDataSource) => IMempoolTransactionRepository;
export type IValidatorRoundRepositoryFactory = (dataSource: RepositoryDataSource) => IValidatorRoundRepository;
export type IStateRepositoryFactory = (dataSource: RepositoryDataSource) => IStateRepository;
export type IWalletRepositoryFactory = (dataSource: RepositoryDataSource) => IWalletRepository;

export { Entity, Repository } from "typeorm";
export { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

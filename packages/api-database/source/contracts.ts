import { type DataSource, EntityManager, Repository } from "typeorm";

import { Block } from "./models/block";
import { Peer } from "./models/peer";
import { Transaction } from "./models/transaction";
import { ValidatorRound } from "./models/validator-round";
import { Wallet } from "./models/wallet";
import { State } from "./models";

export type RepositoryDataSource = DataSource | EntityManager;

export type IBlockRepository = Repository<Block> & {
	getLatest(): Promise<Block | null>;
};

export type IPeerRepository = Repository<Peer>;
export type ITransactionRepository = Repository<Transaction>;
export type IValidatorRoundRepository = Repository<ValidatorRound>;
export type IStateRepository = Repository<State>;
export type IWalletRepository = Repository<Wallet>;

export type IBlockRepositoryFactory = (dataSource: RepositoryDataSource) => IBlockRepository;
export type IPeerRepositoryFactory = (dataSource: RepositoryDataSource) => IPeerRepository;
export type ITransactionRepositoryFactory = (dataSource: RepositoryDataSource) => ITransactionRepository;
export type IValidatorRoundRepositoryFactory = (dataSource: RepositoryDataSource) => IValidatorRoundRepository;
export type IStateRepositoryFactory = (dataSource: RepositoryDataSource) => IStateRepository;
export type IWalletRepositoryFactory = (dataSource: RepositoryDataSource) => IWalletRepository;

export { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

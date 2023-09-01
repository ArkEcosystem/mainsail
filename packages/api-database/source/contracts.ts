import { type DataSource, EntityManager, Repository } from "typeorm";
import { type PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

import { Block } from "./models/block";
import { Transaction } from "./models/transaction";

export { type PostgresConnectionOptions };
export type RepositoryDataSource = DataSource | EntityManager;

export type IBlockRepository = Repository<Block> & {
	getLatest(): Promise<Block | null>;
};

export type ITransactionRepository = Repository<Transaction>;

export type IBlockRepositoryFactory = (dataSource: RepositoryDataSource) => IBlockRepository;
export type ITransactionRepositoryFactory = (dataSource: RepositoryDataSource) => ITransactionRepository;
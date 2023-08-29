
import { type DataSource, Repository, EntityManager } from "typeorm";
import { type PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { Block } from "./models/block";
import { Transaction } from "./models/transaction";

export { type PostgresConnectionOptions };

export type RepositoryDataSource = DataSource | EntityManager;

export interface DatabaseFactory {
    make(options: PostgresConnectionOptions): Promise<DataSource>;
}

export type IBlockRepository = Repository<Block> & {
    getLatest(): Promise<Block | null>;
}

export type ITransactionRepository = Repository<Transaction>;

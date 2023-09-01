import { Providers, Utils } from "@mainsail/kernel";
import { Identifiers } from "./identifiers";
import { PostgresConnectionOptions, RepositoryDataSource } from "./contracts";
import { DataSource } from "typeorm";
import { Block, Transaction } from "./models";
import { SnakeNamingStrategy } from "./utils/snake-naming-strategy";
import { makeBlockRepository, makeTransactionRepository } from "./repositories";

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		await this.#configureDatabase();
	}

	public async dispose(): Promise<void> {
		if (!this.app.isBound(Identifiers.DataSource)) {
			return;
		}

		await this.app.get<DataSource>(Identifiers.DataSource).destroy();
	}

	async #configureDatabase(): Promise<void> {
		if (this.app.isBound(Identifiers.DataSource)) {
			return;
		}

		const options = this.config().get<PostgresConnectionOptions>("database");
		Utils.assert.defined<PostgresConnectionOptions>(options);

		try {
			const dataSource = new DataSource({
				...options,
				// TODO: allow entities to be extended by plugins
				entities: [Block, Transaction],
				namingStrategy: new SnakeNamingStrategy(),
			});

			await dataSource.initialize();

			// Temporary workaround to ensure entities are synchronized when running for the first time.
			const [synchronized] = await dataSource.query("select exists(select 1 from migrations where name = 'synchronized' limit 1)");
			if (!synchronized.exists) {
				await dataSource.synchronize(true);
				await dataSource.runMigrations();
				await dataSource.query("insert into migrations (timestamp, name) values (extract(epoch from now()), 'synchronized')")
			}

			this.app.bind(Identifiers.DataSource).toConstantValue(dataSource);
			this.app.bind(Identifiers.BlockRepository).toConstantValue(makeBlockRepository(dataSource));
			this.app.bind(Identifiers.TransactionRepository).toConstantValue(makeTransactionRepository(dataSource));

			// Bind factories to allow creating repositories in a transaction context

			this.app.bind(Identifiers.BlockRepositoryFactory).toFactory(() => {
				return (dataSource: RepositoryDataSource) => makeBlockRepository(dataSource)
			});

			this.app.bind(Identifiers.TransactionRepositoryFactory).toFactory(() => {
				return (dataSource: RepositoryDataSource) => makeTransactionRepository(dataSource)
			});

		} catch (error) {
			await this.app.terminate("Failed to configure database!", error);
		}
	}
}

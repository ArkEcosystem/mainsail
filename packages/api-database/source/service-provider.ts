import { Providers, Utils } from "@mainsail/kernel";
import { DataSource } from "typeorm";

import { PostgresConnectionOptions, RepositoryDataSource } from "./contracts";
import { Identifiers } from "./identifiers";
import { Block, Transaction } from "./models";
import { makeBlockRepository, makeTransactionRepository } from "./repositories";
import { SnakeNamingStrategy } from "./utils/snake-naming-strategy";
import { ValidatorRound } from "./models/validator-round";
import { makeValidatorRoundRepository } from "./repositories/validator-round-repository";

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
				entities: [Block, Transaction, ValidatorRound],
				namingStrategy: new SnakeNamingStrategy(),
			});

			await dataSource.initialize();

			// Temporary workaround to ensure entities are synchronized when running for the first time.
			const [synchronized] = await dataSource.query(
				"select exists(select 1 from migrations where name = 'synchronized' limit 1)",
			);
			if (!synchronized.exists) {
				await dataSource.synchronize(true);
				await dataSource.runMigrations();
				await dataSource.query(
					"insert into migrations (timestamp, name) values (extract(epoch from now()), 'synchronized')",
				);
			}

			this.app.bind(Identifiers.DataSource).toConstantValue(dataSource);
			this.app.bind(Identifiers.BlockRepository).toConstantValue(makeBlockRepository(dataSource));
			this.app.bind(Identifiers.TransactionRepository).toConstantValue(makeTransactionRepository(dataSource));
			this.app.bind(Identifiers.ValidatorRoundRepository).toConstantValue(makeValidatorRoundRepository(dataSource));

			// Bind factories to allow creating repositories in a transaction context

			this.app
				.bind(Identifiers.BlockRepositoryFactory)
				.toFactory(() => (dataSource: RepositoryDataSource) => makeBlockRepository(dataSource));

			this.app
				.bind(Identifiers.TransactionRepositoryFactory)
				.toFactory(() => (dataSource: RepositoryDataSource) => makeTransactionRepository(dataSource));

			this.app
				.bind(Identifiers.ValidatorRoundRepositoryFactory)
				.toFactory(() => (dataSource: RepositoryDataSource) => makeValidatorRoundRepository(dataSource));

		} catch (error) {
			await this.app.terminate("Failed to configure database!", error);
		}
	}
}

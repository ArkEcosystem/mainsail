import { Providers, Utils } from "@mainsail/kernel";
import { DataSource } from "typeorm";

import { PostgresConnectionOptions, RepositoryDataSource } from "./contracts.js";
import { Identifiers } from "./identifiers.js";
import { Migrations } from "./migrations.js";
import {
	ApiNode,
	Block,
	Configuration,
	MempoolTransaction,
	Peer,
	Plugin,
	State,
	Transaction,
	TransactionType,
	ValidatorRound,
	Wallet,
} from "./models/index.js";
import {
	makeApiNodeRepository,
	makeBlockRepository,
	makeConfigurationRepository,
	makeMempoolTransactionRepository,
	makePeerRepository,
	makePluginRepository,
	makeStateRepository,
	makeTransactionRepository,
	makeTransactionTypeRepository,
	makeValidatorRoundRepository,
	makeWalletRepository,
} from "./repositories/index.js";
import { SnakeNamingStrategy } from "./utils/snake-naming-strategy.js";

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
				entities: [
					ApiNode,
					Block,
					Configuration,
					Peer,
					MempoolTransaction,
					Plugin,
					State,
					TransactionType,
					Transaction,
					ValidatorRound,
					Wallet,
				],
				migrations: [__dirname + "/migrations/*.js"],
				migrationsRun: false,
				namingStrategy: new SnakeNamingStrategy(),
				synchronize: false,
			});

			// Note: this only initializes the connection pool, etc. but does not run migrations.
			// Migrations are handled during bootstrap elsewhere in the main process (see sync.ts)
			await dataSource.initialize();

			this.app.bind(Identifiers.DataSource).toConstantValue(dataSource);
			this.app.bind(Identifiers.Migrations).to(Migrations).inSingletonScope();

			// Bind factories to allow creating repositories in a transaction context
			this.app
				.bind(Identifiers.ApiNodeRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeApiNodeRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.BlockRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeBlockRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.ConfigurationRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeConfigurationRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.PeerRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makePeerRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.MempoolTransactionRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeMempoolTransactionRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.PluginRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makePluginRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.StateRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeStateRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.TransactionRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeTransactionRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.TransactionTypeRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeTransactionTypeRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.ValidatorRoundRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeValidatorRoundRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind(Identifiers.WalletRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeWalletRepository(customDataSource ?? dataSource),
				);
		} catch (error) {
			await this.app.terminate("Failed to configure database!", error);
		}
	}
}

import { injectable } from "@mainsail/container";
import { Providers } from "@mainsail/kernel";
import { assert } from "@mainsail/utils";
import { DataSource } from "typeorm";
import { URL } from "url";

import {
	ApiNodeRepository,
	BlockRepository,
	ConfigurationRepository,
	ContractRepository,
	LegacyColdWalletRepository,
	PeerRepository,
	PluginRepository,
	PostgresConnectionOptions,
	ReceiptRepository,
	RepositoryDataSource,
	StateRepository,
	TransactionRepository,
	TransactionTypeRepository,
	ValidatorRoundRepository,
	WalletRepository,
} from "./contracts.js";
import { Identifiers } from "./identifiers.js";
import { Migrations } from "./migrations.js";
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
import {
	makeApiNodeRepository,
	makeBlockRepository,
	makeConfigurationRepository,
	makeContractRepository,
	makeLegacyColdWalletRepository,
	makePeerRepository,
	makePluginRepository,
	makeReceiptRepository,
	makeStateRepository,
	makeTransactionRepository,
	makeTransactionTypeRepository,
	makeValidatorRoundRepository,
	makeWalletRepository,
} from "./repositories/index.js";
import { SnakeNamingStrategy } from "./utils/snake-naming-strategy.js";

@injectable()
export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		if (!this.#isEnabled()) {
			return;
		}

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
		assert.defined(options);

		try {
			const dataSource = new DataSource({
				...options,
				// TODO: allow entities to be extended by plugins
				entities: [
					ApiNode,
					Block,
					Configuration,
					Contract,
					Peer,
					Plugin,
					Receipt,
					State,
					TransactionType,
					Transaction,
					ValidatorRound,
					Wallet,
					LegacyColdWallet,
				],
				migrations: [new URL(".", import.meta.url).pathname + "/migrations/*.js"],
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
				.bind<() => ApiNodeRepository>(Identifiers.ApiNodeRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeApiNodeRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => BlockRepository>(Identifiers.BlockRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeBlockRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => ConfigurationRepository>(Identifiers.ConfigurationRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeConfigurationRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => ContractRepository>(Identifiers.ContractRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeContractRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => PeerRepository>(Identifiers.PeerRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makePeerRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => PluginRepository>(Identifiers.PluginRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makePluginRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => ReceiptRepository>(Identifiers.ReceiptRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeReceiptRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => StateRepository>(Identifiers.StateRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeStateRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => TransactionRepository>(Identifiers.TransactionRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeTransactionRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => TransactionTypeRepository>(Identifiers.TransactionTypeRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeTransactionTypeRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => ValidatorRoundRepository>(Identifiers.ValidatorRoundRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeValidatorRoundRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => WalletRepository>(Identifiers.WalletRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeWalletRepository(customDataSource ?? dataSource),
				);

			this.app
				.bind<() => LegacyColdWalletRepository>(Identifiers.LegacyColdWalletRepositoryFactory)
				.toFactory(
					() => (customDataSource?: RepositoryDataSource) =>
						makeLegacyColdWalletRepository(customDataSource ?? dataSource),
				);
		} catch (error) {
			await this.app.terminate("Failed to configure database!", error);
		}
	}

	#isEnabled(): boolean {
		return (
			this.app.name() === "api" ||
			(this.config().getRequired<boolean>("enabled") === true && !this.app.isWorker())
		);
	}
}

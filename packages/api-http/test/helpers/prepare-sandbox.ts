import { Identifiers } from "@mainsail/contracts";
import { Providers, Application } from "@mainsail/kernel";

import {
	ServiceProvider as CoreApiDatabase,
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
} from "../../../api-database";
import { ServiceProvider as CoreApiHttp } from "../../../api-http";
import { Sandbox } from "../../../test-framework";

export class ApiContext {
	public constructor(
		private app: Application,
		private readonly apiHttp: CoreApiHttp,
		private readonly apiDatabase: CoreApiDatabase,
	) { }

	public get dataSource(): ApiDatabaseContracts.RepositoryDataSource {
		return this.app.get<ApiDatabaseContracts.RepositoryDataSource>(ApiDatabaseIdentifiers.DataSource);
	}

	public get blockRepository(): ApiDatabaseContracts.IBlockRepository {
		return this.app.get<ApiDatabaseContracts.IBlockRepositoryFactory>(
			ApiDatabaseIdentifiers.BlockRepositoryFactory,
		)();
	}

	public get transactionRepository(): ApiDatabaseContracts.ITransactionRepository {
		return this.app.get<ApiDatabaseContracts.ITransactionRepositoryFactory>(
			ApiDatabaseIdentifiers.TransactionRepositoryFactory,
		)();
	}

	public get transactionTypeRepository(): ApiDatabaseContracts.ITransactionTypeRepository {
		return this.app.get<ApiDatabaseContracts.ITransactionTypeRepositoryFactory>(
			ApiDatabaseIdentifiers.TransactionTypeRepositoryFactory,
		)();
	}

	public get mempoolTransactionRepository(): ApiDatabaseContracts.IMempoolTransactionRepository {
		return this.app.get<ApiDatabaseContracts.IMempoolTransactionRepositoryFactory>(
			ApiDatabaseIdentifiers.MempoolTransactionRepositoryFactory,
		)();
	}

	public get walletRepository(): ApiDatabaseContracts.IWalletRepository {
		return this.app.get<ApiDatabaseContracts.IWalletRepositoryFactory>(
			ApiDatabaseIdentifiers.WalletRepositoryFactory,
		)();
	}

	public get peerRepository(): ApiDatabaseContracts.IPeerRepository {
		return this.app.get<ApiDatabaseContracts.IPeerRepositoryFactory>(
			ApiDatabaseIdentifiers.PeerRepositoryFactory,
		)();
	}

	public get stateRepository(): ApiDatabaseContracts.IStateRepository {
		return this.app.get<ApiDatabaseContracts.IStateRepositoryFactory>(
			ApiDatabaseIdentifiers.StateRepositoryFactory,
		)();
	}

	public get configurationRepository(): ApiDatabaseContracts.IConfigurationRepository {
		return this.app.get<ApiDatabaseContracts.IConfigurationRepositoryFactory>(
			ApiDatabaseIdentifiers.ConfigurationRepositoryFactory,
		)();
	}

	public async reset() {
		const dataSource = this.app.get<any>(ApiDatabaseIdentifiers.DataSource);
		await dataSource.dropDatabase();
		await dataSource.synchronize(true);
		await dataSource.runMigrations();
	}

	public async dispose() {
		await this.apiHttp.dispose();
		await this.apiDatabase.dispose();
	}
}

export const prepareSandbox = async (context: { sandbox: Sandbox }): Promise<ApiContext> => {
	context.sandbox = new Sandbox();

	context.sandbox.app.bind(Identifiers.PluginConfiguration).to(Providers.PluginConfiguration).inSingletonScope();

	context.sandbox.app.bind(Identifiers.LogService).toConstantValue({
		info: (msg) => console.log(msg),
		notice: (msg) => console.log(msg),
		error: (msg) => console.log(msg),
	});

	const apiDatabase = await setupDatabase(context.sandbox.app);
	const apiHttp = await setupHttp(context.sandbox.app);

	return new ApiContext(context.sandbox.app, apiHttp, apiDatabase);
};

const setupDatabase = async (app: Application): Promise<CoreApiDatabase> => {
	const pluginConfiguration = app
		.get<Providers.PluginConfiguration>(Identifiers.PluginConfiguration)
		.discover("@mainsail/api-database", "@mainsail/api-database")
		.merge({
			database: {
				...databaseOptions,
				applicationName: "mainsail/api-database-test",
				migrationsRun: true,
				dropSchema: true,
				synchronize: true,
				logging: false,
			},
		});

	const database = app.resolve(CoreApiDatabase);
	database.setConfig(pluginConfiguration);
	await database.register();

	return database;
};

const setupHttp = async (app: Application): Promise<CoreApiHttp> => {
	const pluginConfiguration = app
		.get<Providers.PluginConfiguration>(Identifiers.PluginConfiguration)
		.discover("@mainsail/api-http", "@mainsail/api-http")
		.merge({
			server: { http: { enabled: true, host: "127.0.0.1", port: 4003 } },
			plugins: {
				pagination: {
					limit: 100,
				},
				socketTimeout: 5000,
			},
			database: {
				...databaseOptions,
				applicationName: "mainsail/api-http-test",
			},
		});

	const server = app.resolve(CoreApiHttp);
	server.setConfig(pluginConfiguration);
	await server.register();
	await server.boot();

	return server;
};

// TODO: either use env or hardcode same values for postgres in CI
const databaseOptions = {
	type: "postgres",
	database: "test_db",
	username: "test_db",
	entityPrefix: "public.",
	password: "password",
	host: "localhost",
	port: 5432,
	logger: "simple-console",
	migrationsRun: false,
	dropSchema: false,
	synchronize: false,
	logging: false,
};

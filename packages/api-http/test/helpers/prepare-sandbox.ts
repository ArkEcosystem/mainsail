import {
	Contracts as ApiDatabaseContracts,
	Identifiers as ApiDatabaseIdentifiers,
	ServiceProvider as CoreApiDatabase,
} from "@mainsail/api-database";
import { Identifiers } from "@mainsail/contracts";
import { Application, Providers } from "@mainsail/kernel";

import { Sandbox } from "../../../test-framework/source";
import { Validator } from "../../../validation/source/validator";
import { ServiceProvider as CoreApiHttp } from "../../source/service-provider";

export class ApiContext {
	public constructor(
		private app: Application,
		private readonly apiHttp: CoreApiHttp,
		private readonly apiDatabase: CoreApiDatabase,
	) {}

	public get dataSource(): ApiDatabaseContracts.RepositoryDataSource {
		return this.app.get<ApiDatabaseContracts.RepositoryDataSource>(ApiDatabaseIdentifiers.DataSource);
	}

	public get apiNodesRepository(): ApiDatabaseContracts.ApiNodeRepository {
		return this.app.get<ApiDatabaseContracts.ApiNodeRepositoryFactory>(
			ApiDatabaseIdentifiers.ApiNodeRepositoryFactory,
		)();
	}

	public get blockRepository(): ApiDatabaseContracts.BlockRepository {
		return this.app.get<ApiDatabaseContracts.BlockRepositoryFactory>(
			ApiDatabaseIdentifiers.BlockRepositoryFactory,
		)();
	}

	public get transactionRepository(): ApiDatabaseContracts.TransactionRepository {
		return this.app.get<ApiDatabaseContracts.TransactionRepositoryFactory>(
			ApiDatabaseIdentifiers.TransactionRepositoryFactory,
		)();
	}

	public get transactionTypeRepository(): ApiDatabaseContracts.TransactionTypeRepository {
		return this.app.get<ApiDatabaseContracts.TransactionTypeRepositoryFactory>(
			ApiDatabaseIdentifiers.TransactionTypeRepositoryFactory,
		)();
	}

	public get mempoolTransactionRepository(): ApiDatabaseContracts.MempoolTransactionRepository {
		return this.app.get<ApiDatabaseContracts.MempoolTransactionRepositoryFactory>(
			ApiDatabaseIdentifiers.MempoolTransactionRepositoryFactory,
		)();
	}

	public get walletRepository(): ApiDatabaseContracts.WalletRepository {
		return this.app.get<ApiDatabaseContracts.WalletRepositoryFactory>(
			ApiDatabaseIdentifiers.WalletRepositoryFactory,
		)();
	}

	public get peerRepository(): ApiDatabaseContracts.PeerRepository {
		return this.app.get<ApiDatabaseContracts.PeerRepositoryFactory>(ApiDatabaseIdentifiers.PeerRepositoryFactory)();
	}

	public get stateRepository(): ApiDatabaseContracts.StateRepository {
		return this.app.get<ApiDatabaseContracts.StateRepositoryFactory>(
			ApiDatabaseIdentifiers.StateRepositoryFactory,
		)();
	}

	public get configurationRepository(): ApiDatabaseContracts.ConfigurationRepository {
		return this.app.get<ApiDatabaseContracts.ConfigurationRepositoryFactory>(
			ApiDatabaseIdentifiers.ConfigurationRepositoryFactory,
		)();
	}

	public get validatorRoundRepository(): ApiDatabaseContracts.ValidatorRoundRepository {
		return this.app.get<ApiDatabaseContracts.ValidatorRoundRepositoryFactory>(
			ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory,
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

	context.sandbox.app
		.bind(Identifiers.ServiceProvider.Configuration)
		.to(Providers.PluginConfiguration)
		.inSingletonScope();

	context.sandbox.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({});
	context.sandbox.app.bind(Identifiers.Cryptography.Validator).to(Validator).inSingletonScope();

	context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue({
		error: (message) => console.log(message),
		info: (message) => console.log(message),
		notice: (message) => console.log(message),
	});

	context.sandbox.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });

	const apiDatabase = await setupDatabase(context.sandbox.app);
	const apiHttp = await setupHttp(context.sandbox.app);

	return new ApiContext(context.sandbox.app, apiHttp, apiDatabase);
};

const setupDatabase = async (app: Application): Promise<CoreApiDatabase> => {
	const pluginConfiguration = await app
		.get<Providers.PluginConfiguration>(Identifiers.ServiceProvider.Configuration)
		.discover("@mainsail/api-database", "@mainsail/api-database");

	pluginConfiguration.merge({
		database: {
			...databaseOptions,
			applicationName: "mainsail/api-database-test",
			dropSchema: true,
			logging: false,
			migrationsRun: true,
			synchronize: true,
		},
	});

	const database = app.resolve(CoreApiDatabase);
	database.setConfig(pluginConfiguration);
	await database.register();

	return database;
};

const setupHttp = async (app: Application): Promise<CoreApiHttp> => {
	const pluginConfiguration = await app
		.get<Providers.PluginConfiguration>(Identifiers.ServiceProvider.Configuration)
		.discover("@mainsail/api-http", "@mainsail/api-http");

	pluginConfiguration.merge({
		database: {
			...databaseOptions,
			applicationName: "mainsail/api-http-test",
		},
		plugins: {
			pagination: {
				limit: 100,
			},
			socketTimeout: 5000,
		},
		server: { http: { enabled: true, host: "127.0.0.1", port: 4003 } },
	});

	const server = app.resolve(CoreApiHttp);
	server.setConfig(pluginConfiguration);
	await server.register();
	await server.boot();

	return server;
};

// TODO: either use env or hardcode same values for postgres in CI
const databaseOptions = {
	database: "test_db",
	dropSchema: false,
	entityPrefix: "public.",
	host: "localhost",
	logger: "simple-console",
	logging: false,
	migrationsRun: false,
	password: "password",
	port: 5432,
	synchronize: false,
	type: "postgres",
	username: "test_db",
};

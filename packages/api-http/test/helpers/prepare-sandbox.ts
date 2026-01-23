import type { Contracts as ApiDatabaseContracts } from "@mainsail/api-database";
import { Identifiers as ApiDatabaseIdentifiers, ServiceProvider as CoreApiDatabase } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { Container } from "@mainsail/container";
import { Application, Providers } from "@mainsail/kernel";

import { ServiceProvider as CoreApiHttp } from "../../source/service-provider.js";

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
		enabled: true,
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
		enabled: false,
		plugins: {
			pagination: {
				limit: 100,
			},
			socketTimeout: 5000,
		},
		server: { http: { enabled: true, host: "127.0.0.1", port: 4003 }, https: { enabled: false } },
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

	public get contractRepository(): ApiDatabaseContracts.ContractRepository {
		return this.app.get<ApiDatabaseContracts.ContractRepositoryFactory>(
			ApiDatabaseIdentifiers.ContractRepositoryFactory,
		)();
	}

	public get transactionRepository(): ApiDatabaseContracts.TransactionRepository {
		return this.app.get<ApiDatabaseContracts.TransactionRepositoryFactory>(
			ApiDatabaseIdentifiers.TransactionRepositoryFactory,
		)();
	}

	public get multiPaymentRepository(): ApiDatabaseContracts.MultiPaymentRepository {
		return this.app.get<ApiDatabaseContracts.MultiPaymentRepositoryFactory>(
			ApiDatabaseIdentifiers.MultiPaymentRepositoryFactory,
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

	public get tokenRepository(): ApiDatabaseContracts.TokenRepository {
		return this.app.get<ApiDatabaseContracts.TokenRepositoryFactory>(
			ApiDatabaseIdentifiers.TokenRepositoryFactory,
		)();
	}

	public get tokenHolderRepository(): ApiDatabaseContracts.TokenHolderRepository {
		return this.app.get<ApiDatabaseContracts.TokenHolderRepositoryFactory>(
			ApiDatabaseIdentifiers.TokenHolderRepositoryFactory,
		)();
	}

	public get tokenTransferRepository(): ApiDatabaseContracts.TokenTransferRepository {
		return this.app.get<ApiDatabaseContracts.TokenTransferRepositoryFactory>(
			ApiDatabaseIdentifiers.TokenTransferRepositoryFactory,
		)();
	}

	public async reset() {
		const dataSource = this.app.get<any>(ApiDatabaseIdentifiers.DataSource);
		await dataSource.dropDatabase();
		await dataSource.synchronize(true);
		await dataSource.runMigrations();

		await this.stateRepository.save({ blockNumber: "0", id: 0, supply: "1500000" });
	}

	public async dispose() {
		await this.apiHttp.dispose();
		await this.apiDatabase.dispose();
	}
}

export const prepareSandbox = async (context: { app: Application }): Promise<ApiContext> => {
	context.app = new Application(new Container());

	context.app.bind(Identifiers.Application.Name).toConstantValue("api-http-integration");

	context.app.bind(Identifiers.ServiceProvider.Configuration).to(Providers.PluginConfiguration).inSingletonScope();

	context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({});

	context.app.bind(Identifiers.Services.Log.Service).toConstantValue({
		error: (message) => console.log(message),
		info: (message) => console.log(message),
		notice: (message) => console.log(message),
		warning: (message) => console.log(message),
	});

	context.app.bind(Identifiers.Cryptography.Validator).toConstantValue({
		hasSchema: () => true,
	});

	context.app.bind(Identifiers.Services.Filesystem.Service).toConstantValue({ existsSync: () => true });

	const apiDatabase = await setupDatabase(context.app);
	const apiHttp = await setupHttp(context.app);

	return new ApiContext(context.app, apiHttp, apiDatabase);
};

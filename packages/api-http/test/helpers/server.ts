import { Identifiers as ApiDatabaseIdentifiers } from "@mainsail/api-database";
import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";

import { Identifiers as ApiHttpIdentifiers } from "../../source/identifiers";
import { Server } from "../../source/server";
import { ServiceProvider } from "../../source/service-provider";
import { makePage } from "../fixtures/entities";

// Mutable per-repository result store; tests assign what the next terminal call returns.
export type RepoData = {
	one?: unknown; // getOne / findOneByCriteria / getLatest
	many?: unknown[]; // getMany
	manyAndCount?: [unknown[], number]; // getManyAndCount (defaults to [many, many.length])
	rawMany?: unknown[]; // getRawMany
	rawOne?: unknown; // getRawOne
	page?: ReturnType<typeof makePage>; // findManyByCriteria / findManyValidatorsByCritera
	feeStatistics?: { avg: string; max: string; min: string; sum: string };
	peerBlockNumberP90?: number;
	latestHeight?: number; // getLatestHeight (x-block-number response header)
};

const CHAIN_METHODS = [
	"select",
	"addSelect",
	"where",
	"andWhere",
	"orWhere",
	"orderBy",
	"addOrderBy",
	"limit",
	"offset",
	"innerJoin",
	"leftJoin",
	"setParameter",
	"setParameters",
	"from",
	"addCommonTableExpression",
];

export const makeQueryBuilder = (data: RepoData) => {
	const calls: Record<string, any[][]> = {};
	const record = (method: string, args: any[]) => {
		(calls[method] ??= []).push(args);
	};

	const qb: any = { calls };
	for (const method of CHAIN_METHODS) {
		qb[method] = (...args: any[]) => {
			record(method, args);
			return qb;
		};
	}

	qb.clone = () => qb;
	qb.getParameters = () => ({});
	qb.getQuery = () => "SELECT 1";
	// Terminal methods are recorded as well, so tests can assert a lookup was skipped.
	qb.getOne = async () => {
		record("getOne", []);
		return data.one ?? null;
	};
	qb.getMany = async () => {
		record("getMany", []);
		return data.many ?? [];
	};
	qb.getManyAndCount = async () => {
		record("getManyAndCount", []);
		return data.manyAndCount ?? [data.many ?? [], (data.many ?? []).length];
	};
	qb.getRawMany = async () => {
		record("getRawMany", []);
		return data.rawMany ?? [];
	};
	qb.getRawOne = async () => {
		record("getRawOne", []);
		return data.rawOne;
	};

	return qb;
};

export const makeRepo = () => {
	const data: RepoData = {};
	const qb = makeQueryBuilder(data);
	const calls: Record<string, any[][]> = {};
	const record = (method: string, args: any[]) => {
		(calls[method] ??= []).push(args);
	};

	return {
		calls,
		createQueryBuilder: () => qb,
		data,
		findManyByCriteria: async (...args: any[]) => {
			record("findManyByCriteria", args);
			return data.page ?? makePage([]);
		},
		findManyValidatorsByCritera: async (...args: any[]) => {
			record("findManyValidatorsByCritera", args);
			return data.page ?? makePage([]);
		},
		findOneByCriteria: async (...args: any[]) => {
			record("findOneByCriteria", args);
			return data.one ?? null;
		},
		getFeeStatistics: async (...args: any[]) => {
			record("getFeeStatistics", args);
			return data.feeStatistics;
		},
		getLatest: async () => data.one ?? null,
		// Matches the real contract: undefined when the database is empty.
		getLatestHeight: async () => data.latestHeight,
		getPeerBlockNumberP90: async () => data.peerBlockNumberP90 ?? 0,
		qb,
	};
};

const makeDataSource = () => {
	const data: RepoData = {};
	const queries: any[][] = [];

	return {
		createQueryBuilder: () => makeQueryBuilder(data),
		data,
		queries,
		query: async (...args: any[]) => {
			queries.push(args);
			return data.rawMany ?? [];
		},
	};
};

export type Repos = ReturnType<typeof makeRepos>;

export const makeRepos = () => ({
	apiNode: makeRepo(),
	block: makeRepo(),
	configuration: makeRepo(),
	contract: makeRepo(),
	dataSource: makeDataSource(),
	legacyColdWallet: makeRepo(),
	peer: makeRepo(),
	plugin: makeRepo(),
	state: makeRepo(),
	system: { inMaintenance: async () => false },
	token: makeRepo(),
	tokenAction: makeRepo(),
	tokenHolder: makeRepo(),
	tokenWhitelist: makeRepo(),
	transaction: makeRepo(),
	validatorRound: makeRepo(),
	wallet: makeRepo(),
});

// A factory instead of a shared constant so tests can mutate their copy freely.
export const makeConfiguration = () => ({
	options: { estimateTotalCount: true },
	plugins: {
		cache: { checkperiod: 120, enabled: false, stdTTL: 8 },
		log: { enabled: false },
		pagination: { limit: 100 },
		rateLimit: { blacklist: [], duration: 60, enabled: false, points: 100, whitelist: [] },
		socketTimeout: 5000,
		trustProxy: false,
		whitelist: ["*"],
	},
	server: {
		http: { enabled: true, host: "127.0.0.1", port: 0 },
		https: { enabled: false, host: "127.0.0.1", port: 0, tls: {} },
	},
	tokens: { defaultMinimumBalance: 0.01 },
});

export const bindDependencies = (app: Application, repositories: Repos): void => {
	app.bind(Identifiers.Services.Log.Service).toConstantValue({
		debug: () => {},
		error: () => {},
		info: () => {},
		notice: () => {},
		warning: () => {},
	});
	app.bind(Identifiers.Cryptography.Validator).toConstantValue({ addSchema: () => {}, hasSchema: () => false });

	app.bind(ApiDatabaseIdentifiers.DataSource).toConstantValue(repositories.dataSource);
	app.bind(ApiDatabaseIdentifiers.ApiNodeRepositoryFactory).toConstantValue(() => repositories.apiNode);
	app.bind(ApiDatabaseIdentifiers.BlockRepositoryFactory).toConstantValue(() => repositories.block);
	app.bind(ApiDatabaseIdentifiers.ConfigurationRepositoryFactory).toConstantValue(() => repositories.configuration);
	app.bind(ApiDatabaseIdentifiers.ContractRepositoryFactory).toConstantValue(() => repositories.contract);
	app.bind(ApiDatabaseIdentifiers.LegacyColdWalletRepositoryFactory).toConstantValue(
		() => repositories.legacyColdWallet,
	);
	app.bind(ApiDatabaseIdentifiers.PeerRepositoryFactory).toConstantValue(() => repositories.peer);
	app.bind(ApiDatabaseIdentifiers.PluginRepositoryFactory).toConstantValue(() => repositories.plugin);
	app.bind(ApiDatabaseIdentifiers.StateRepositoryFactory).toConstantValue(() => repositories.state);
	app.bind(ApiDatabaseIdentifiers.SystemRepositoryFactory).toConstantValue(() => repositories.system);
	app.bind(ApiDatabaseIdentifiers.TokenActionRepositoryFactory).toConstantValue(() => repositories.tokenAction);
	app.bind(ApiDatabaseIdentifiers.TokenHolderRepositoryFactory).toConstantValue(() => repositories.tokenHolder);
	app.bind(ApiDatabaseIdentifiers.TokenRepositoryFactory).toConstantValue(() => repositories.token);
	app.bind(ApiDatabaseIdentifiers.TokenWhitelistRepositoryFactory).toConstantValue(() => repositories.tokenWhitelist);
	app.bind(ApiDatabaseIdentifiers.TransactionRepositoryFactory).toConstantValue(() => repositories.transaction);
	app.bind(ApiDatabaseIdentifiers.ValidatorRoundRepositoryFactory).toConstantValue(() => repositories.validatorRound);
	app.bind(ApiDatabaseIdentifiers.WalletRepositoryFactory).toConstantValue(() => repositories.wallet);
};

export const registerServiceProvider = async (app: Application, config: object): Promise<ServiceProvider> => {
	const pluginConfiguration = app.resolve(Providers.PluginConfiguration).from("api-http", config);
	app.bind(Identifiers.ServiceProvider.Configuration)
		.toConstantValue(pluginConfiguration)
		.whenTagged("plugin", "api-http");

	const serviceProvider = app.resolve(ServiceProvider);
	serviceProvider.setConfig(pluginConfiguration);

	await serviceProvider.register();

	return serviceProvider;
};

export const bootstrapServer = async (
	repositories: Repos,
	config: object = makeConfiguration(),
): Promise<{ app: Application; server: Server; serviceProvider: ServiceProvider }> => {
	const app = new Application();
	bindDependencies(app, repositories);

	const serviceProvider = await registerServiceProvider(app, config);

	const server = app.isBound(ApiHttpIdentifiers.HTTP)
		? app.get<Server>(ApiHttpIdentifiers.HTTP)
		: (undefined as unknown as Server);

	return { app, server, serviceProvider };
};

import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";

import { Server } from "../../source/server";
import { ServiceProvider } from "../../source/service-provider";
import { makeQueryIterable } from "../fixtures/transactions";

export type ServerDependencies = { processor: object; transactions: unknown[] };

export const poolConfiguration = {
	maxTransactionAge: 2700,
	maxTransactionBytes: 1024,
	maxTransactionsInPool: 15_000,
	maxTransactionsPerRequest: 2,
	maxTransactionsPerSender: 150,
};

// A factory instead of a shared constant so tests can mutate their copy freely.
export const makeConfiguration = () => ({
	plugins: {
		pagination: { limit: 100 },
		rateLimit: { blacklist: [], duration: 60, enabled: false, points: 150, whitelist: [] },
		socketTimeout: 5000,
		trustProxy: false,
		whitelist: ["*"],
	},
	server: {
		http: { enabled: true, host: "127.0.0.1", port: 0 },
		https: { enabled: false, host: "127.0.0.1", port: 0, tls: {} },
	},
});

export const bindDependencies = (app: Application, dependencies: ServerDependencies): void => {
	app.bind(Identifiers.Services.Log.Service).toConstantValue({
		error: () => {},
		info: () => {},
		warn: () => {},
	});
	app.bind(Identifiers.Cryptography.Validator).toConstantValue({
		addSchema: () => {},
		hasSchema: () => false,
	});
	app.bind(Identifiers.Application.Version).toConstantValue("0.0.1-test");

	app.bind(Identifiers.ServiceProvider.Configuration)
		.toConstantValue({
			getRequired: (key: string) => poolConfiguration[key],
		})
		.whenTagged("plugin", "transaction-pool-service");

	app.bind(Identifiers.TransactionPool.Processor).toConstantValue(dependencies.processor);
	app.bind(Identifiers.TransactionPool.Query).toConstantValue({
		getFromHighestPriority: () => makeQueryIterable(dependencies.transactions),
	});
	app.bind(Identifiers.State.Store).toConstantValue({ getBlockNumber: () => 42 });
};

export const registerServiceProvider = async (app: Application, config: object): Promise<ServiceProvider> => {
	const pluginConfiguration = app.resolve(Providers.PluginConfiguration).from("api-transaction-pool", config);
	app.bind(Identifiers.ServiceProvider.Configuration)
		.toConstantValue(pluginConfiguration)
		.whenTagged("plugin", "api-transaction-pool");

	const serviceProvider = app.resolve(ServiceProvider);
	serviceProvider.setConfig(pluginConfiguration);

	await serviceProvider.register();

	return serviceProvider;
};

export const bootstrapServer = async (
	dependencies: ServerDependencies,
	config: object = makeConfiguration(),
): Promise<{ app: Application; server: Server; serviceProvider: ServiceProvider }> => {
	const app = new Application();
	bindDependencies(app, dependencies);

	const serviceProvider = await registerServiceProvider(app, config);

	return { app, server: app.get<Server>(Identifiers.TransactionPool.API.HTTP), serviceProvider };
};

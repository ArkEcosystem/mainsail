import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import Joi from "joi";

import { describe } from "@mainsail/test-runner";
import { defaults } from "./defaults";
import { ServiceProvider } from "./service-provider";

const importFresh = (moduleName: string) => import(`${moduleName}?${Date.now()}`);

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should bind the broadcaster services as singletons", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.TransactionPool.Peer.Repository));
		assert.true(app.isBound(Identifiers.TransactionPool.Peer.Communicator));
		assert.true(app.isBound(Identifiers.TransactionPool.Broadcaster));
		assert.true(app.isBound(Identifiers.TransactionPool.Peer.Factory));
	});

	it("#register - the peer factory should build a peer with the configured port", async ({
		app,
		serviceProvider,
	}) => {
		serviceProvider.setConfig(
			new Providers.PluginConfiguration().from("transaction-pool-broadcaster", { txPoolPort: 1234 }),
		);

		await serviceProvider.register();

		const factory = app.get<(ip: string) => any>(Identifiers.TransactionPool.Peer.Factory);
		const peer = factory("1.2.3.4");

		assert.equal(peer.ip, "1.2.3.4");
		assert.equal(peer.port, 1234);
		assert.equal(peer.url, "http://1.2.3.4:1234");
	});
});

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider.configSchema", ({ it, assert, beforeEach }) => {
	const importDefaults = async () => (await importFresh("../distribution/defaults.js")).defaults;

	beforeEach((context) => {
		context.app = new Application();
		context.serviceProvider = context.app.resolve(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key.includes("MAINSAIL_TRANSACTION_POOL_") || key.includes("MAINSAIL_API_TRANSACTION_POOL_")) {
				delete process.env[key];
			}
		}
	});

	it("should validate schema using defaults", async ({ serviceProvider }) => {
		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(await importDefaults());

		assert.undefined(result.error);
		assert.number(result.value.maxPeersBroadcast);
		assert.number(result.value.maxSequentialErrors);
		assert.number(result.value.txPoolPort);
	});

	it("should allow configuration extension", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.customField = "dummy";

		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("maxPeersBroadcast is required && is number && >= 0", ({ serviceProvider }) => {
		const config: any = { ...defaults, maxPeersBroadcast: false };
		let result = (serviceProvider.configSchema() as Joi.AnySchema).validate(config);

		assert.equal(result.error?.message, '"maxPeersBroadcast" must be a number');

		config.maxPeersBroadcast = -1;
		result = (serviceProvider.configSchema() as Joi.AnySchema).validate(config);

		assert.equal(result.error?.message, '"maxPeersBroadcast" must be greater than or equal to 0');

		delete config.maxPeersBroadcast;
		result = (serviceProvider.configSchema() as Joi.AnySchema).validate(config);

		assert.equal(result.error?.message, '"maxPeersBroadcast" is required');
	});

	it("maxSequentialErrors is required && is number && >= 0", ({ serviceProvider }) => {
		const config: any = { ...defaults, maxSequentialErrors: false };
		let result = (serviceProvider.configSchema() as Joi.AnySchema).validate(config);

		assert.equal(result.error?.message, '"maxSequentialErrors" must be a number');

		config.maxSequentialErrors = -1;
		result = (serviceProvider.configSchema() as Joi.AnySchema).validate(config);

		assert.equal(result.error?.message, '"maxSequentialErrors" must be greater than or equal to 0');

		delete config.maxSequentialErrors;
		result = (serviceProvider.configSchema() as Joi.AnySchema).validate(config);

		assert.equal(result.error?.message, '"maxSequentialErrors" is required');
	});

	it("txPoolPort is required && is number && >= 0", ({ serviceProvider }) => {
		const config: any = { ...defaults, txPoolPort: false };
		let result = (serviceProvider.configSchema() as Joi.AnySchema).validate(config);

		assert.equal(result.error?.message, '"txPoolPort" must be a number');

		config.txPoolPort = -1;
		result = (serviceProvider.configSchema() as Joi.AnySchema).validate(config);

		assert.equal(result.error?.message, '"txPoolPort" must be greater than or equal to 0');

		delete config.txPoolPort;
		result = (serviceProvider.configSchema() as Joi.AnySchema).validate(config);

		assert.equal(result.error?.message, '"txPoolPort" is required');
	});

	it("should parse process.env.MAINSAIL_TRANSACTION_POOL_MAX_PEER_BROADCAST", async ({ serviceProvider }) => {
		process.env.MAINSAIL_TRANSACTION_POOL_MAX_PEER_BROADCAST = "10";

		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.maxPeersBroadcast, 10);
	});

	it("should throw if process.env.MAINSAIL_TRANSACTION_POOL_MAX_PEER_BROADCAST is not number", async ({
		serviceProvider,
	}) => {
		process.env.MAINSAIL_TRANSACTION_POOL_MAX_PEER_BROADCAST = "false";

		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(await importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"maxPeersBroadcast" must be a number');
	});

	it("should parse process.env.MAINSAIL_TRANSACTION_POOL_MAX_PEER_SEQUENTIAL_ERRORS", async ({ serviceProvider }) => {
		process.env.MAINSAIL_TRANSACTION_POOL_MAX_PEER_SEQUENTIAL_ERRORS = "5";

		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.maxSequentialErrors, 5);
	});

	it("should throw if process.env.MAINSAIL_TRANSACTION_POOL_MAX_PEER_SEQUENTIAL_ERRORS is not number", async ({
		serviceProvider,
	}) => {
		process.env.MAINSAIL_TRANSACTION_POOL_MAX_PEER_SEQUENTIAL_ERRORS = "false";

		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(await importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"maxSequentialErrors" must be a number');
	});

	it("should parse process.env.MAINSAIL_API_TRANSACTION_POOL_PORT", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_PORT = "5000";

		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.txPoolPort, 5000);
	});

	it("should throw if process.env.MAINSAIL_API_TRANSACTION_POOL_PORT is not number", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_PORT = "false";

		const result = (serviceProvider.configSchema() as Joi.AnySchema).validate(await importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"txPoolPort" must be a number');
	});
});

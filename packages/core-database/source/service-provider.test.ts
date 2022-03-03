import { Application, Providers } from "@arkecosystem/core-kernel";
import { Container } from "@arkecosystem/core-container";
import importFresh from "import-fresh";
import { AnySchema } from "joi";

import { describe } from "../../core-test-framework";
import { defaults } from "./defaults";
import { ServiceProvider } from "./service-provider";
import { typeorm } from "./typeorm";

const loadDefaults = (): { defaults: Record<string, any> } => importFresh("./defaults");

describe<{
	app: Application;
	logger: any;
	events: any;
}>("ServiceProvider", ({ assert, beforeEach, it, spyFn, stub }) => {
	beforeEach((context) => {
		context.logger = {
			debug: spyFn(),
			info: spyFn(),
		};

		context.events = {
			dispatch: spyFn(),
		};

		context.app = new Application(new Container());
		context.app.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.app.bind(Identifiers.EventDispatcherService).toConstantValue(context.events);
	});

	it("register should connect to database, bind triggers, and bind services", async (context) => {
		const mockCreateConnection = stub(typeorm, "createConnection").callsFake(spyFn());
		const mockGetCustomRepository = stub(typeorm, "getCustomRepository").callsFake(spyFn());

		const serviceProvider = context.app.resolve(ServiceProvider);
		const pluginConfiguration = context.app
			.resolve(Providers.PluginConfiguration)
			.from("core-database", { ...defaults });
		serviceProvider.setConfig(pluginConfiguration);

		await serviceProvider.register();

		mockCreateConnection.calledOnce();
		mockGetCustomRepository.calledTimes(3);
		assert.true(context.events.dispatch.calledWith());

		assert.true(context.app.isBound(Identifiers.DatabaseConnection));
		assert.true(context.app.isBound(Identifiers.DatabaseRoundRepository));
		assert.true(context.app.isBound(Identifiers.DatabaseBlockRepository));
		assert.true(context.app.isBound(Identifiers.DatabaseBlockFilter));
		assert.true(context.app.isBound(Identifiers.BlockHistoryService));
		assert.true(context.app.isBound(Identifiers.DatabaseTransactionRepository));
		assert.true(context.app.isBound(Identifiers.DatabaseTransactionFilter));
		assert.true(context.app.isBound(Identifiers.TransactionHistoryService));
		assert.true(context.app.isBound(Identifiers.DatabaseModelConverter));
		assert.true(context.app.isBound(Identifiers.DatabaseService));
	});

	it("boot should call DatabaseService.initialize method", async (context) => {
		const serviceProvider = context.app.resolve(ServiceProvider);

		const databaseService = { initialize: spyFn() };
		context.app.bind(Identifiers.DatabaseService).toConstantValue(databaseService);

		await serviceProvider.boot();

		assert.true(databaseService.initialize.calledWith());
	});

	it("dispose should call DatabaseService.disconnect method", async (context) => {
		const serviceProvider = context.app.resolve(ServiceProvider);

		const databaseService = { disconnect: spyFn() };
		context.app.bind(Identifiers.DatabaseService).toConstantValue(databaseService);

		await serviceProvider.dispose();

		assert.true(databaseService.disconnect.calledWith());
	});

	it("required should return true", async (context) => {
		const serviceProvider = context.app.resolve(ServiceProvider);

		const result = await serviceProvider.required();

		assert.is(result, true);
	});
});

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider.configSchema", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.serviceProvider = context.app.resolve<ServiceProvider>(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key.includes("CORE_DB_")) {
				delete process.env[key];
			}
		}

		process.env.CORE_TOKEN = "ark";
		process.env.CORE_NETWORK_NAME = "testnet";
	});

	it("should validate schema using defaults", async (context) => {
		const { defaults } = loadDefaults();

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.connection.type, "postgres");
		assert.equal(result.value.connection.host, "localhost");
		assert.equal(result.value.connection.port, 5432);
		assert.equal(result.value.connection.database, "ark_testnet");
		assert.equal(result.value.connection.username, "ark");
		assert.string(result.value.connection.password);
		assert.string(result.value.connection.entityPrefix);
		assert.false(result.value.connection.synchronize);
		assert.false(result.value.connection.logging);
	});

	it("should allow configuration extension", async (context) => {
		const { defaults } = loadDefaults();

		// @ts-ignore
		defaults.customField = "dummy";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("should return value of process.env.CORE_DB_HOST if defined", async (context) => {
		process.env.CORE_DB_HOST = "custom_hostname";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(loadDefaults().defaults);

		assert.undefined(result.error);
		assert.equal(result.value.connection.host, "custom_hostname");
	});

	it("should return value of process.env.CORE_DB_PORT if defined", async (context) => {
		process.env.CORE_DB_PORT = "123";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(loadDefaults().defaults);

		assert.undefined(result.error);
		assert.equal(result.value.connection.port, 123);
	});

	it("should return value of process.env.CORE_DB_DATABASE if defined", async (context) => {
		process.env.CORE_DB_DATABASE = "custom_database";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(loadDefaults().defaults);

		assert.undefined(result.error);
		assert.equal(result.value.connection.database, "custom_database");
	});

	it("should return value of process.env.CORE_DB_USERNAME if defined", async (context) => {
		process.env.CORE_DB_USERNAME = "custom_username";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(loadDefaults().defaults);

		assert.undefined(result.error);
		assert.equal(result.value.connection.username, "custom_username");
	});

	it("should return value of process.env.CORE_DB_PASSWORD if defined", async (context) => {
		process.env.CORE_DB_PASSWORD = "custom_password";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(loadDefaults().defaults);

		assert.undefined(result.error);
		assert.equal(result.value.connection.password, "custom_password");
	});
});

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	defaults: Record<string, any>;
}>("schema restrictions", ({ assert, beforeEach, it }) => {
	beforeEach(async (context) => {
		context.app = new Application(new Container());
		context.serviceProvider = context.app.resolve<ServiceProvider>(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key.includes("CORE_DB_")) {
				delete process.env[key];
			}
		}

		process.env.CORE_TOKEN = "ark";
		process.env.CORE_NETWORK_NAME = "testnet";
		context.defaults = loadDefaults().defaults;
	});

	it("connection is required", async (context) => {
		delete defaults.connection;
		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"connection" is required');
	});

	it("connection.type is required && is string", async (context) => {
		context.defaults.connection.type = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.type" must be a string');

		delete context.defaults.connection.type;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.type" is required');
	});

	it("connection.host is required && is string", async (context) => {
		context.defaults.connection.host = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.host" must be a string');

		delete context.defaults.connection.host;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.host" is required');
	});

	it("connection.port is required && is integer && is >= 1 and <= 65535", async (context) => {
		context.defaults.connection.port = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.port" must be a number');

		context.defaults.connection.port = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.port" must be an integer');

		context.defaults.connection.port = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.port" must be greater than or equal to 1');

		context.defaults.connection.port = 65_536;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.port" must be less than or equal to 65535');

		delete context.defaults.connection.port;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.port" is required');
	});

	it("connection.database is required && is string", async (context) => {
		context.defaults.connection.database = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.database" must be a string');

		delete context.defaults.connection.database;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.database" is required');
	});

	it("connection.username is required && is string", async (context) => {
		context.defaults.connection.username = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.username" must be a string');

		delete context.defaults.connection.username;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.username" is required');
	});

	it("connection.password is required && is string", async (context) => {
		context.defaults.connection.password = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.password" must be a string');

		delete context.defaults.connection.password;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.password" is required');
	});

	it("connection.entityPrefix is required && is string", async (context) => {
		context.defaults.connection.entityPrefix = false;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.entityPrefix" must be a string');

		delete context.defaults.connection.entityPrefix;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.entityPrefix" is required');
	});

	it("connection.synchronize is required && is boolean", async (context) => {
		context.defaults.connection.synchronize = 123;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.synchronize" must be a boolean');

		delete context.defaults.connection.synchronize;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.synchronize" is required');
	});

	it("connection.logging is required && is boolean", async (context) => {
		context.defaults.connection.logging = 123;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.logging" must be a boolean');

		delete context.defaults.connection.logging;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(context.defaults);

		assert.equal(result.error.message, '"connection.logging" is required');
	});
});

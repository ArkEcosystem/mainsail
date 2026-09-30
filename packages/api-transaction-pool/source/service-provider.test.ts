import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { makeTransaction } from "../test/fixtures/transactions";
import { bindDependencies, bootstrapServer, makeConfiguration, registerServiceProvider } from "../test/helpers/server";
import { Server } from "./server";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	server: Server;
	processor: { process: (data: Buffer[]) => Promise<object> };
	transactions: ReturnType<typeof makeTransaction>[];
}>("ServiceProvider", ({ it, assert, beforeEach, afterEach }) => {
	beforeEach(async (context) => {
		context.transactions = [makeTransaction(1), makeTransaction(2)];
		context.processor = { process: async () => ({}) };

		context.app = new Application();
		bindDependencies(context.app, context);

		context.serviceProvider = await registerServiceProvider(context.app, makeConfiguration());

		context.server = context.app.get<Server>(Identifiers.TransactionPool.API.HTTP);
	});

	afterEach(async ({ serviceProvider }) => {
		await serviceProvider.dispose();
	});

	it("#register - binds the http server and boot/dispose start and stop it", async ({
		app,
		serviceProvider,
		server,
	}) => {
		assert.true(app.isBound(Identifiers.TransactionPool.API.HTTP));
		assert.false(app.isBound(Identifiers.TransactionPool.API.HTTPS));
		assert.is(server.prettyName, "Transaction Pool API (HTTP)");

		await serviceProvider.boot();
		assert.string(server.uri);
	});

	it("GET / - responds with the server name", async ({ server }) => {
		const response = await server.inject({ method: "GET", url: "/" });

		assert.is(response.statusCode, 200);
		assert.equal(JSON.parse(response.payload), { data: "Hello World from Transaction Pool API!" });
	});

	it("#register - rate limits requests when the rate limiter is enabled", async ({ processor, transactions }) => {
		const limited = makeConfiguration();
		limited.plugins.rateLimit.enabled = true;
		limited.plugins.rateLimit.points = 1;

		const { server, serviceProvider } = await bootstrapServer({ processor, transactions }, limited);

		try {
			assert.is((await server.inject({ method: "GET", url: "/api/configuration" })).statusCode, 200);
			assert.is((await server.inject({ method: "GET", url: "/api/configuration" })).statusCode, 429);
		} finally {
			await serviceProvider.dispose();
		}
	});

	it("#register - builds the https server when enabled", async ({ app }) => {
		const { execSync } = await import("child_process");
		const { mkdtempSync } = await import("fs");
		const { tmpdir } = await import("os");
		const { join } = await import("path");

		const directory = mkdtempSync(join(tmpdir(), "api-transaction-pool-tls-"));
		const keyPath = join(directory, "key.pem");
		const certPath = join(directory, "cert.pem");
		execSync(
			`openssl req -x509 -newkey rsa:2048 -keyout "${keyPath}" -out "${certPath}" -days 1 -nodes -subj "/CN=localhost"`,
			{ stdio: "ignore" },
		);

		const https = makeConfiguration();
		https.server.http.enabled = false;
		https.server.https.enabled = true;
		https.server.https.tls = { cert: certPath, key: keyPath };

		const serviceProvider = app.resolve(ServiceProvider);
		serviceProvider.setConfig(app.resolve(Providers.PluginConfiguration).from("api-transaction-pool", https));

		try {
			await serviceProvider.register();
			await serviceProvider.boot();

			const server = app.get<Server>(Identifiers.TransactionPool.API.HTTPS);
			assert.is(server.prettyName, "Transaction Pool API (HTTPS)");
			assert.startsWith(server.uri, "https://");

			const response = await server.inject({ method: "GET", url: "/api/configuration" });
			assert.is(response.statusCode, 200);
		} finally {
			await serviceProvider.dispose();
		}
	});

	it("#register - skips both servers when disabled", async () => {
		const app = new Application();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ error: () => {}, info: () => {}, warn: () => {} });
		app.bind(Identifiers.Cryptography.Validator).toConstantValue({ addSchema: () => {}, hasSchema: () => true });

		const disabled = makeConfiguration();
		disabled.server.http.enabled = false;

		const serviceProvider = app.resolve(ServiceProvider);
		serviceProvider.setConfig(app.resolve(Providers.PluginConfiguration).from("api-transaction-pool", disabled));

		await serviceProvider.register();
		await serviceProvider.boot();
		await serviceProvider.dispose();

		assert.false(app.isBound(Identifiers.TransactionPool.API.HTTP));
		assert.false(app.isBound(Identifiers.TransactionPool.API.HTTPS));
	});
});

const importFresh = (moduleName: string) => import(`${moduleName}?${Date.now()}`);

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider.configSchema", ({ it, assert, beforeEach }) => {
	const importDefaults = async () => (await importFresh("../distribution/defaults.js")).defaults;

	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({
			error: () => {},
			info: () => {},
			warn: () => {},
		});
		context.app.bind(Identifiers.Cryptography.Validator).toConstantValue({
			addSchema: () => {},
			hasSchema: () => false,
		});

		context.serviceProvider = context.app.resolve(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key.includes("MAINSAIL_API_TRANSACTION_POOL_")) {
				delete process.env[key];
			}
		}
	});

	it("should validate schema using defaults", async ({ serviceProvider }) => {
		const defaults = await importDefaults();

		const result = serviceProvider.configSchema().validate(defaults);
		assert.undefined(result.error);

		assert.number(result.value.plugins.pagination.limit);
		assert.array(result.value.plugins.rateLimit.blacklist);
		assert.number(result.value.plugins.rateLimit.duration);
		assert.boolean(result.value.plugins.rateLimit.enabled);
		assert.number(result.value.plugins.rateLimit.points);
		assert.array(result.value.plugins.rateLimit.whitelist);
		assert.number(result.value.plugins.socketTimeout);
		assert.boolean(result.value.plugins.trustProxy);
		assert.array(result.value.plugins.whitelist);
		assert.boolean(result.value.server.http.enabled);
		assert.string(result.value.server.http.host);
		assert.number(result.value.server.http.port);
		assert.boolean(result.value.server.https.enabled);
		assert.string(result.value.server.https.host);
		assert.number(result.value.server.https.port);
		assert.object(result.value.server.https.tls);
	});

	it("should allow configuration extension", async ({ serviceProvider }) => {
		const defaults = await importDefaults();

		defaults.customField = "dummy";

		const result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("should parse process.env.MAINSAIL_API_TRANSACTION_POOL_HOST", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_HOST = "127.0.0.1";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.http.host, "127.0.0.1");
	});

	it("should parse process.env.MAINSAIL_API_TRANSACTION_POOL_PORT", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_PORT = "5000";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.http.port, 5000);
	});

	it("should throw if process.env.MAINSAIL_API_TRANSACTION_POOL_PORT is not number", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_PORT = "false";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"server.http.port" must be a number');
	});

	it("should parse process.env.MAINSAIL_API_TRANSACTION_POOL_DISABLED", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_DISABLED = "true";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.http.enabled, false);
	});

	it("should parse process.env.MAINSAIL_API_TRANSACTION_POOL_SSL", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_SSL = "true";
		process.env.MAINSAIL_API_TRANSACTION_POOL_SSL_CERT = "cert";
		process.env.MAINSAIL_API_TRANSACTION_POOL_SSL_KEY = "key";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.https.enabled, true);
	});

	it("should parse process.env.MAINSAIL_API_TRANSACTION_POOL_TRUST_PROXY", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_TRUST_PROXY = "true";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.plugins.trustProxy, true);
	});

	it("should parse process.env.MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_USER_LIMIT", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_TRANSACTION_POOL_RATE_LIMIT_USER_LIMIT = "500";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.plugins.rateLimit.points, 500);
	});

	it("#schemaRestrictions - plugins is required && is object", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.plugins = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins" must be of type object');

		delete defaults.plugins;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins" is required');
	});

	it("#schemaRestrictions - plugins.pagination is required && is object", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.plugins.pagination = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.pagination" must be of type object');

		delete defaults.plugins.pagination;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.pagination" is required');
	});

	it("#schemaRestrictions - plugins.pagination.limit is required && is integer && >= 0", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();
		defaults.plugins.pagination.limit = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.pagination.limit" must be a number');

		defaults.plugins.pagination.limit = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.pagination.limit" must be an integer');

		defaults.plugins.pagination.limit = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.pagination.limit" must be greater than or equal to 0');

		delete defaults.plugins.pagination.limit;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.pagination.limit" is required');
	});

	it("#schemaRestrictions - plugins.rateLimit is required && is object", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.plugins.rateLimit = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit" must be of type object');

		delete defaults.plugins.rateLimit;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit" is required');
	});

	it("#schemaRestrictions - plugins.rateLimit.blacklist is required && is array && contains strings", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();
		defaults.plugins.rateLimit.blacklist = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.blacklist" must be an array');

		defaults.plugins.rateLimit.blacklist = [false];
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.blacklist[0]" must be a string');

		delete defaults.plugins.rateLimit.blacklist;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.blacklist" is required');
	});

	it("#schemaRestrictions - plugins.rateLimit.duration is required && is integer && >= 0", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();
		defaults.plugins.rateLimit.duration = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.duration" must be a number');

		defaults.plugins.rateLimit.duration = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.duration" must be an integer');

		defaults.plugins.rateLimit.duration = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.duration" must be greater than or equal to 0');

		delete defaults.plugins.rateLimit.duration;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.duration" is required');
	});

	it("#schemaRestrictions - plugins.rateLimit.enabled is required && is boolean", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.plugins.rateLimit.enabled = 1;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.enabled" must be a boolean');

		delete defaults.plugins.rateLimit.enabled;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.enabled" is required');
	});

	it("#schemaRestrictions - plugins.rateLimit.points is required && is integer && >= 0", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();
		defaults.plugins.rateLimit.points = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.points" must be a number');

		defaults.plugins.rateLimit.points = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.points" must be an integer');

		defaults.plugins.rateLimit.points = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.points" must be greater than or equal to 0');

		delete defaults.plugins.rateLimit.points;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.points" is required');
	});

	it("#schemaRestrictions - plugins.rateLimit.whitelist is required && is array && contains strings", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();
		defaults.plugins.rateLimit.whitelist = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.whitelist" must be an array');

		defaults.plugins.rateLimit.whitelist = [false];
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.whitelist[0]" must be a string');

		delete defaults.plugins.rateLimit.whitelist;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.rateLimit.whitelist" is required');
	});

	it("#schemaRestrictions - plugins.socketTimeout is required && is integer && >= 0", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.plugins.socketTimeout = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.socketTimeout" must be a number');

		defaults.plugins.socketTimeout = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.socketTimeout" must be an integer');

		defaults.plugins.socketTimeout = -1;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.socketTimeout" must be greater than or equal to 0');

		delete defaults.plugins.socketTimeout;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.socketTimeout" is required');
	});

	it("#schemaRestrictions - plugins.trustProxy is required && is boolean", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.plugins.trustProxy = 1;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.trustProxy" must be a boolean');

		delete defaults.plugins.trustProxy;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.trustProxy" is required');
	});

	it("#schemaRestrictions - plugins.whitelist is required && is array && contains strings", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();
		defaults.plugins.whitelist = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.whitelist" must be an array');

		defaults.plugins.whitelist = [false];
		result = serviceProvider.configSchema().validate(defaults);

		// The base api-common schema and this package's concat both declare items(Joi.string()),
		// so the accumulated item types are reported as alternatives.
		assert.equal(result.error?.message, '"plugins.whitelist[0]" does not match any of the allowed types');

		delete defaults.plugins.whitelist;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"plugins.whitelist" is required');
	});

	it("#schemaRestrictions - server is required && is object", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.server = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server" must be of type object');

		delete defaults.server;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server" is required');
	});

	it("#schemaRestrictions - server.http is required && is object", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.server.http = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http" must be of type object');

		delete defaults.server.http;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http" is required');
	});

	it("#schemaRestrictions - server.http.enabled is required && is boolean", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.server.http.enabled = 1;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http.enabled" must be a boolean');

		delete defaults.server.http.enabled;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http.enabled" is required');
	});

	it("#schemaRestrictions - server.http.host is required && is string", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.server.http.host = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http.host" must be a string');

		delete defaults.server.http.host;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http.host" is required');
	});

	it("#schemaRestrictions - server.http.port is required && is integer && >= 1 && <= 65535", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();
		defaults.server.http.port = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http.port" must be a number');

		defaults.server.http.port = 1.12;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http.port" must be an integer');

		defaults.server.http.port = 0;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http.port" must be greater than or equal to 1');

		defaults.server.http.port = 65_536;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http.port" must be less than or equal to 65535');

		delete defaults.server.http.port;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.http.port" is required');
	});

	it("#schemaRestrictions - server.https is required && is object", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.server.https = false;
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.https" must be of type object');

		delete defaults.server.https;
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.https" is required');
	});

	it("#schemaRestrictions - server.https.tls.cert && key required when https enabled", async ({
		serviceProvider,
	}) => {
		const defaults = await importDefaults();
		defaults.server.https.enabled = true;
		defaults.server.https.tls = {};
		let result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.https.tls.cert" is required');

		defaults.server.https.tls = { cert: "cert" };
		result = serviceProvider.configSchema().validate(defaults);

		assert.equal(result.error?.message, '"server.https.tls.key" is required');

		defaults.server.https.tls = { cert: "cert", key: "key" };
		result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);
	});
});

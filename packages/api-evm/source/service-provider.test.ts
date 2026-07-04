import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import Handlers from "./handlers.js";
import { Server } from "./server.js";
import { ServiceProvider } from "./service-provider.js";

const makeConfig = () => ({
	plugins: {
		rateLimit: {
			blacklist: [],
			duration: 60,
			enabled: true,
			points: 150,
			whitelist: [],
		},
		socketTimeout: 5000,
		trustProxy: false,
		whitelist: ["*"],
	},
	server: {
		http: { enabled: false, host: "127.0.0.1", port: 4008 },
		https: {
			enabled: false,
			host: "127.0.0.1",
			port: 8446,
			tls: { cert: undefined, key: undefined },
		},
	},
});

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	validator: any;
	addedKeywords: any[];
	addedSchemas: any[];
	store: any;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	const setConfig = (app: Application, serviceProvider: ServiceProvider, config: any) => {
		const pluginConfiguration = app.resolve(Providers.PluginConfiguration).from("api-evm", config);
		serviceProvider.setConfig(pluginConfiguration);
	};

	beforeEach((context) => {
		context.addedKeywords = [];
		context.addedSchemas = [];

		context.store = {
			getBlockNumber: () => 5,
		};

		context.validator = {
			addKeyword: (keyword: any) => context.addedKeywords.push(keyword),
			addSchema: (schema: any) => context.addedSchemas.push(schema),
			hasSchema: () => false,
			validate: () => ({}),
		};

		context.app = new Application();
		context.app.bind(Identifiers.State.Store).toConstantValue(context.store);
		context.app.bind(Identifiers.Cryptography.Validator).toConstantValue(context.validator);

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("register should add the blockTag schema to the validator", async ({ app, serviceProvider, addedSchemas }) => {
		setConfig(app, serviceProvider, makeConfig());

		await serviceProvider.register();

		assert.true(addedSchemas.some((s) => s.$id === "blockTag"));
	});

	it("getActions should resolve all 27 RPC actions with unique names", async ({ app, serviceProvider }) => {
		// Bind the dependencies every action @injects so app.resolve() succeeds.
		app.bind(Identifiers.Evm.Instance).toConstantValue({}).whenTagged("instance", "rpc");
		app.bind(Identifiers.Evm.State).toConstantValue({});
		app.bind(Identifiers.Database.Service).toConstantValue({});
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue({});
		app.bind(Identifiers.Application.Version).toConstantValue("1.0.0");

		const actions = (serviceProvider as any).getActions();

		assert.length(actions, 27);

		const names = actions.map((a: any) => a.name);
		assert.true(names.includes("eth_call"));
		assert.true(names.includes("eth_sendRawTransaction"));
		assert.true(names.includes("web3_clientVersion"));
		// all names unique
		assert.is(new Set(names).size, names.length);
	});

	it("getPlugins should return whitelist, rateLimit and rpcResponseHandler plugins with mapped options", ({
		app,
		serviceProvider,
	}) => {
		setConfig(app, serviceProvider, makeConfig());

		const plugins = (serviceProvider as any).getPlugins();

		assert.length(plugins, 3);

		// whitelist plugin maps trustProxy + whitelist
		assert.equal(plugins[0].options, { trustProxy: false, whitelist: ["*"] });

		// rateLimit plugin spreads rateLimit config + trustProxy
		assert.equal(plugins[1].options, {
			blacklist: [],
			duration: 60,
			enabled: true,
			points: 150,
			trustProxy: false,
			whitelist: [],
		});

		// rpcResponseHandler has no options
		assert.undefined(plugins[2].options);
	});

	it("httpIdentifier should return Identifiers.Evm.API.HTTP", ({ serviceProvider }) => {
		assert.is((serviceProvider as any).httpIdentifier(), Identifiers.Evm.API.HTTP);
	});

	it("httpsIdentifier should return Identifiers.Evm.API.HTTPS", ({ serviceProvider }) => {
		assert.is((serviceProvider as any).httpsIdentifier(), Identifiers.Evm.API.HTTPS);
	});

	it("getServerConstructor should return the Server class", ({ serviceProvider }) => {
		assert.is((serviceProvider as any).getServerConstructor(), Server);
	});

	it("getHandlers should return the Handlers plugin", ({ serviceProvider }) => {
		assert.is((serviceProvider as any).getHandlers(), Handlers);
	});

	it("boot should resolve", async ({ serviceProvider }) => {
		await assert.resolves(() => serviceProvider.boot());
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
		context.app.bind(Identifiers.State.Store).toConstantValue({ getBlockNumber: () => 5 });
		context.app.bind(Identifiers.Cryptography.Validator).toConstantValue({
			addKeyword: () => {},
			addSchema: () => {},
			hasSchema: () => false,
			validate: () => ({}),
		});

		context.serviceProvider = context.app.resolve(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key.includes("MAINSAIL_API_EVM_")) {
				delete process.env[key];
			}
		}
	});

	it("should validate schema using defaults", async ({ serviceProvider }) => {
		const defaults = await importDefaults();

		const result = serviceProvider.configSchema().validate(defaults);
		assert.undefined(result.error);

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

	it("should parse process.env.MAINSAIL_API_EVM_HOST", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_EVM_HOST = "127.0.0.1";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.http.host, "127.0.0.1");
	});

	it("should parse process.env.MAINSAIL_API_EVM_PORT", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_EVM_PORT = "5000";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.http.port, 5000);
	});

	it("should throw if process.env.MAINSAIL_API_EVM_PORT is not number", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_EVM_PORT = "false";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.defined(result.error);
		assert.equal(result.error?.message, '"server.http.port" must be a number');
	});

	it("should parse process.env.MAINSAIL_API_EVM_DISABLED", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_EVM_DISABLED = "true";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.http.enabled, false);
	});

	it("should parse process.env.MAINSAIL_API_EVM_SSL", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_EVM_SSL = "true";
		process.env.MAINSAIL_API_EVM_SSL_CERT = "cert";
		process.env.MAINSAIL_API_EVM_SSL_KEY = "key";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.server.https.enabled, true);
	});

	it("should parse process.env.MAINSAIL_API_EVM_TRUST_PROXY", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_EVM_TRUST_PROXY = "true";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.plugins.trustProxy, true);
	});

	it("should parse process.env.MAINSAIL_API_EVM_RATE_LIMIT_USER_LIMIT", async ({ serviceProvider }) => {
		process.env.MAINSAIL_API_EVM_RATE_LIMIT_USER_LIMIT = "500";

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

		assert.equal(result.error?.message, '"plugins.whitelist[0]" must be a string');

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

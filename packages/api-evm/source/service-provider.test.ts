import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { defaults } from "./defaults.js";
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

	it("register should add the currentHeightHex keyword to the validator", async ({
		app,
		serviceProvider,
		addedKeywords,
	}) => {
		setConfig(app, serviceProvider, makeConfig());

		await serviceProvider.register();

		const heightKeyword = addedKeywords.find((k) => k.keyword === "currentHeightHex");
		assert.defined(heightKeyword);
	});

	it("register should add the blockTag schema to the validator", async ({ app, serviceProvider, addedSchemas }) => {
		setConfig(app, serviceProvider, makeConfig());

		await serviceProvider.register();

		assert.true(addedSchemas.some((s) => s.$id === "blockTag"));
	});

	it("configSchema should accept a full valid config", ({ serviceProvider }) => {
		const result = serviceProvider.configSchema().validate(makeConfig());
		assert.undefined(result.error);
	});

	it("configSchema should accept the shipped defaults", ({ serviceProvider }) => {
		const result = serviceProvider.configSchema().validate(defaults);
		assert.undefined(result.error);
	});

	it("configSchema should reject config missing rateLimit", ({ serviceProvider }) => {
		const config = makeConfig();
		// @ts-ignore
		delete config.plugins.rateLimit;

		const result = serviceProvider.configSchema().validate(config);
		assert.defined(result.error);
	});

	it("configSchema should reject an out-of-range http port", ({ serviceProvider }) => {
		const config = makeConfig();
		config.server.http.port = 70_000;

		const result = serviceProvider.configSchema().validate(config);
		assert.defined(result.error);
	});

	it("configSchema should reject https enabled without tls key/cert", ({ serviceProvider }) => {
		const config = makeConfig();
		config.server.https.enabled = true;

		const result = serviceProvider.configSchema().validate(config);
		assert.defined(result.error);
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
});

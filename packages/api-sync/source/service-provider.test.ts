import { Identifiers } from "@mainsail/constants";
import { Application, Providers } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import Joi from "joi";

import { Listeners } from "./listeners.js";
import { ServiceProvider } from "./service-provider.js";

const baseConfig = {
	enabled: true,
	restore: { blocks: { batchSize: 500 } },
	syncInterval: 8000,
	tokenCacheSize: 256,
	tokenWhitelistRefreshInterval: 60_000,
	tokenWhitelistRemoteUrl: "",
};

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	configure: (config: Record<string, unknown>) => void;
	validate: (config: Record<string, unknown>) => Joi.ValidationResult;
}>("ServiceProvider", ({ it, beforeEach, assert, stub, spy }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.serviceProvider = context.app.resolve(ServiceProvider);

		context.configure = (config) => {
			context.serviceProvider.setConfig(
				context.app.resolve(Providers.PluginConfiguration).from("api-sync", config),
			);
		};

		context.validate = (config) => context.serviceProvider.configSchema().validate(config);
	});

	it("register: binds all api-sync services and hooks up the listeners", async ({
		app,
		serviceProvider,
		configure,
	}) => {
		configure(baseConfig);

		// The concrete listeners can only resolve against a live database, so their
		// registration is stubbed out; the wiring itself is under test here.
		const register = stub(Listeners.prototype, "register").resolvedValue(undefined);

		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.ApiSync.Listener));
		assert.true(app.isBound(Identifiers.ApiSync.Logger));
		assert.true(app.isBound(Identifiers.ApiSync.TokenParser));
		assert.true(app.isBound(Identifiers.ApiSync.TokenWhitelist));
		assert.true(app.isBound(Identifiers.ApiSync.Service));
		register.calledOnce();

		register.restore();
	});

	it("register: does nothing when the plugin is disabled", async ({ app, serviceProvider, configure }) => {
		configure({ ...baseConfig, enabled: false });

		await serviceProvider.register();

		assert.false(app.isBound(Identifiers.ApiSync.Listener));
		assert.false(app.isBound(Identifiers.ApiSync.Service));
	});

	it("register: does nothing inside a worker thread", async ({ app, serviceProvider, configure }) => {
		configure(baseConfig);
		const isWorker = stub(app, "isWorker").returnValue(true);

		await serviceProvider.register();

		assert.false(app.isBound(Identifiers.ApiSync.Listener));
		assert.false(app.isBound(Identifiers.ApiSync.Service));

		isWorker.restore();
	});

	it("dispose: flushes the service and disposes listeners and whitelist", async ({
		app,
		serviceProvider,
		configure,
	}) => {
		configure(baseConfig);

		const service = { flush: async () => {} };
		const listeners = { dispose: async () => {} };
		const whitelist = { dispose: async () => {} };

		app.bind(Identifiers.ApiSync.Service).toConstantValue(service);
		app.bind(Identifiers.ApiSync.Listener).toConstantValue(listeners);
		app.bind(Identifiers.ApiSync.TokenWhitelist).toConstantValue(whitelist);

		const flush = spy(service, "flush");
		const disposeListeners = spy(listeners, "dispose");
		const disposeWhitelist = spy(whitelist, "dispose");

		await serviceProvider.dispose();

		flush.calledOnce();
		disposeListeners.calledOnce();
		disposeWhitelist.calledOnce();
	});

	it("dispose: does nothing when the plugin is disabled", async ({ serviceProvider, configure }) => {
		configure({ ...baseConfig, enabled: false });

		// No services are bound; a non-guarded dispose would fail to resolve them.
		await assert.resolves(() => serviceProvider.dispose());
	});

	it("configSchema: accepts a valid configuration and unknown keys", ({ validate }) => {
		const result = validate({ ...baseConfig, customFlag: true });

		assert.undefined(result.error);
		assert.equal(result.value.restore.blocks.batchSize, 500);
		assert.true(result.value.customFlag);
	});

	it("configSchema: requires syncInterval", ({ validate }) => {
		const { syncInterval, ...config } = baseConfig;

		const result = validate(config);

		assert.defined(result.error);
		assert.true(result.error!.message.includes("syncInterval"));
	});

	it("configSchema: rejects non-positive intervals and sizes", ({ validate }) => {
		for (const override of [
			{ syncInterval: 0 },
			{ tokenCacheSize: -1 },
			{ tokenWhitelistRefreshInterval: 0 },
			{ restore: { blocks: { batchSize: 0 } } },
		]) {
			const result = validate({ ...baseConfig, ...override });

			assert.defined(result.error);
		}
	});

	it("configSchema: rejects non-integer values", ({ validate }) => {
		for (const override of [{ syncInterval: 1.5 }, { tokenCacheSize: 2.5 }]) {
			const result = validate({ ...baseConfig, ...override });

			assert.defined(result.error);
		}
	});
});

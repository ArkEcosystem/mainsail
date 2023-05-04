import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Application, Services } from "@mainsail/core-kernel";
import importFresh from "import-fresh";
import { AnySchema } from "joi";

import { describe } from "../../core-test-framework";
import { ServiceProvider } from ".";

const importDefaults = () => importFresh<any>("../distribution/defaults.js").defaults;

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert, stub }) => {
	beforeEach((context) => {
		const app = new Application(new Container());
		app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

		context.serviceProvider = app.resolve<ServiceProvider>(ServiceProvider);
		context.app = app;
	});

	it("should register", async (context) => {
		await assert.resolves(() => context.serviceProvider.register());
	});

	it("should boot and dispose", async (context) => {
		const stubbedApp = stub(context.app, "get").returnValue({
			bind: () => {},
			boot: () => {},
			initialize: () => {},
		});

		await context.serviceProvider.register();

		assert.resolves(async () => await context.serviceProvider.boot());

		stubbedApp.restore();
	});

	it("should boot when the package is database", async (context) => {
		assert.false(await context.serviceProvider.bootWhen());
		assert.false(await context.serviceProvider.bootWhen("not-database"));
		assert.true(await context.serviceProvider.bootWhen("@mainsail/database"));
	});
});

describe<{
	serviceProvider: ServiceProvider;
}>("ServiceProvider.configSchema", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		const app = new Application(new Container());
		app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();

		context.serviceProvider = app.resolve<ServiceProvider>(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key === "CORE_WALLET_SYNC_ENABLED") {
				delete process.env[key];
			}
		}
	});

	it("should validate schema using defaults", (context) => {
		const defaults = importDefaults();

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);

		assert.number(result.value.storage.maxLastBlocks);
		assert.number(result.value.storage.maxLastTransactionIds);

		assert.false(result.value.walletSync.enabled);
	});

	it("should allow configuration extension", (context) => {
		const defaults = importDefaults();

		// @ts-ignore
		defaults.customField = "dummy";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("should return value of process.env.CORE_WALLET_SYNC_ENABLED if defined", (context) => {
		process.env.CORE_WALLET_SYNC_ENABLED = "true";

		const result = (context.serviceProvider.configSchema() as AnySchema).validate(importDefaults());

		assert.undefined(result.error);
		assert.true(result.value.walletSync.enabled);
	});

	it("has schema restrictions - storage is required && is object", (context) => {
		const defaults = importDefaults();
		defaults.storage = true;

		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage" must be of type object');

		delete defaults.storage;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage" is required');
	});

	it("has schema restrictions - storage.maxLastBlocks is required && is integer && >= 1", (context) => {
		const defaults = importDefaults();

		defaults.storage.maxLastBlocks = true;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage.maxLastBlocks" must be a number');

		defaults.storage.maxLastBlocks = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage.maxLastBlocks" must be an integer');

		defaults.storage.maxLastBlocks = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage.maxLastBlocks" must be greater than or equal to 1');

		delete defaults.storage.maxLastBlocks;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage.maxLastBlocks" is required');
	});

	it("has schema restrictions - storage.maxLastTransactionIds is required && is integer && >= 1", (context) => {
		const defaults = importDefaults();

		defaults.storage.maxLastTransactionIds = true;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage.maxLastTransactionIds" must be a number');

		defaults.storage.maxLastTransactionIds = 1.12;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage.maxLastTransactionIds" must be an integer');

		defaults.storage.maxLastTransactionIds = 0;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage.maxLastTransactionIds" must be greater than or equal to 1');

		delete defaults.storage.maxLastTransactionIds;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"storage.maxLastTransactionIds" is required');
	});

	it("has schema restrictions - walletSync is required && is object", (context) => {
		const defaults = importDefaults();

		defaults.walletSync = true;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"walletSync" must be of type object');

		delete defaults.walletSync;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"walletSync" is required');
	});

	it("has schema restrictions - walletSync.enabled is required && is boolean", (context) => {
		const defaults = importDefaults();

		defaults.walletSync.enabled = 123;
		let result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"walletSync.enabled" must be a boolean');

		delete defaults.walletSync.enabled;
		result = (context.serviceProvider.configSchema() as AnySchema).validate(defaults);

		assert.equal(result.error.message, '"walletSync.enabled" is required');
	});
});

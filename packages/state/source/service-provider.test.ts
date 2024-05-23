import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";
import { Application, Services } from "@mainsail/kernel";

import { describe, Sandbox } from "../../test-framework/source";
import { ServiceProvider } from ".";

const importFresh = (moduleName) => import(`${moduleName}?${Date.now()}`);

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const app = new Application(new Container());
		app.bind(Identifiers.Services.Trigger.Service).to(Services.Triggers.Triggers).inSingletonScope();
		app.bind(Identifiers.Services.Log.Service).toConstantValue({});
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		context.serviceProvider = app.resolve<ServiceProvider>(ServiceProvider);
		context.app = app;
	});

	it("should register", async (context) => {
		await assert.resolves(() => context.serviceProvider.register());
	});

	it("should boot and dispose", async (context) => {
		await context.serviceProvider.register();

		await assert.resolves(() => context.serviceProvider.boot());
	});
});

describe<{
	sandbox: Sandbox;
	serviceProvider: ServiceProvider;
}>("ServiceProvider.configSchema", ({ it, assert, beforeEach }) => {
	const importDefaults = async () => (await importFresh("../distribution/defaults.js")).defaults;

	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.serviceProvider = context.sandbox.app.resolve(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key.includes("CORE_STATE_")) {
				delete process.env[key];
			}
		}
	});

	it("should validate schema using defaults", async ({ serviceProvider }) => {
		const defaults = await importDefaults();

		const result = serviceProvider.configSchema().validate(defaults);
		assert.undefined(result.error);

		assert.object(result.value.snapshots);
		assert.boolean(result.value.snapshots.enabled);
		assert.number(result.value.snapshots.interval);
		assert.number(result.value.snapshots.retainFiles);
	});

	it("should parse process.env.CORE_STATE_SNAPSHOTS_DISABLED", async ({ serviceProvider }) => {
		process.env.CORE_STATE_SNAPSHOTS_DISABLED = "true";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.snapshots.enabled, false);
	});

	it("should parse process.env.CORE_STATE_SNAPSHOTS_INTERVAL", async ({ serviceProvider }) => {
		process.env.CORE_STATE_SNAPSHOTS_INTERVAL = "3";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.snapshots.interval, 3);
	});

	it("should parse process.env.CORE_STATE_SNAPSHOTS_INTERVAL", async ({ serviceProvider }) => {
		process.env.CORE_STATE_SNAPSHOTS_RETAIN_FILES = "3";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.snapshots.retainFiles, 3);
	});
});

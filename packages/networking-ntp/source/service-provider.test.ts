import Sntp from "@hapi/sntp";
import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { AnySchema } from "joi";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

const importFresh = (moduleName) => import(`${moduleName}?${Date.now()}`);

const loadDefaults = async () => (await importFresh("./defaults")).defaults;

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, beforeEach, assert, stub }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("should register", async ({ serviceProvider }) => {
		await assert.resolves(() => serviceProvider.register());
	});

	it("should boot and run the checker", async ({ app, serviceProvider }) => {
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: (key: string) => ({ hosts: ["a.ntp.test"], timeout: 500 })[key] })
			.whenTagged("plugin", "networking-ntp");
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ error: () => {}, info: () => {} });

		const time = stub(Sntp, "time").resolvedValue({ t: 7 });

		await assert.resolves(() => serviceProvider.boot());

		time.calledOnce();
	});

	it("should validate schema using defaults", async ({ serviceProvider }) => {
		const result = (serviceProvider.configSchema() as AnySchema).validate(await loadDefaults());

		assert.undefined(result.error);

		assert.array(result.value.hosts);
		for (const host of result.value.hosts) {
			assert.string(host);
		}
		assert.equal(result.value.timeout, 1000);
	});

	it("should allow configuration extension", async ({ serviceProvider }) => {
		const writableDefaults = await loadDefaults();

		writableDefaults.customField = "dummy";

		const result = (serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("hosts is required && is array of strings", async ({ serviceProvider }) => {
		const writableDefaults = await loadDefaults();

		writableDefaults.hosts = false;
		let result = (serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"hosts" must be an array');

		writableDefaults.hosts = [1];
		result = (serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"hosts[0]" must be a string');

		delete writableDefaults.hosts;
		result = (serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"hosts" is required');
	});

	it("timeout is required && is integer && min 1", async ({ serviceProvider }) => {
		const writableDefaults = await loadDefaults();

		writableDefaults.timeout = false;
		let result = (serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"timeout" must be a number');

		writableDefaults.timeout = 1.5;
		result = (serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"timeout" must be an integer');

		writableDefaults.timeout = 0;
		result = (serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"timeout" must be greater than or equal to 1');

		delete writableDefaults.timeout;
		result = (serviceProvider.configSchema() as AnySchema).validate(writableDefaults);

		assert.equal(result.error.message, '"timeout" is required');
	});
});

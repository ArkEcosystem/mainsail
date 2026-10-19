import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { BlockForger } from "./block-forger";
import { defaults } from "./defaults";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should bind the block forger as a singleton", async ({ app, serviceProvider }) => {
		assert.false(app.isBound(Identifiers.Forger.Block));

		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Forger.Block));

		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		app.bind(Identifiers.State.Store).toConstantValue({});
		app.bind(Identifiers.Cryptography.Block.Factory).toConstantValue({});
		app.bind(Identifiers.Cryptography.Hash.Factory).toConstantValue({});

		const blockForger = app.get(Identifiers.Forger.Block);
		assert.instance(blockForger, BlockForger);
		assert.is(app.get(Identifiers.Forger.Block), blockForger);
	});

	it("#configSchema - should validate the defaults", ({ serviceProvider }) => {
		const result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.txCollatorFactor, 0.75);
	});

	it("#configSchema - should allow boundary values and unknown keys", ({ serviceProvider }) => {
		const schema = serviceProvider.configSchema();

		assert.undefined(schema.validate({ txCollatorFactor: 0 }).error);
		assert.undefined(schema.validate({ txCollatorFactor: 1 }).error);
		assert.undefined(schema.validate({ txCollatorFactor: 0.5, unknown: true }).error);
	});

	it("#configSchema - should reject invalid configurations", ({ serviceProvider }) => {
		const schema = serviceProvider.configSchema();

		for (const config of [
			{},
			{ txCollatorFactor: undefined },
			{ txCollatorFactor: -0.1 },
			{ txCollatorFactor: 1.1 },
			{ txCollatorFactor: "invalid" },
		]) {
			assert.defined(schema.validate(config).error);
		}
	});
});

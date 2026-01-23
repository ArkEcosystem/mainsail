import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

type Context = {
	app: Application;
	serviceProvider: ServiceProvider;
};

describe<Context>("ServiceProvider", ({ assert, it, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();
		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("should register all calculators", async ({ app, serviceProvider }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.BlockchainUtils.ProposerCalculator));
		assert.true(app.isBound(Identifiers.BlockchainUtils.FeeCalculator));
		assert.true(app.isBound(Identifiers.BlockchainUtils.RoundCalculator));
		assert.true(app.isBound(Identifiers.BlockchainUtils.TimestampCalculator));
	});
});

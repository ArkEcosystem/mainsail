import { Identifiers } from "@mainsail/constants";

import { describe, Sandbox } from "@mainsail/test-framework";
import { ServiceProvider } from "./service-provider";

type Context = {
	sandbox: Sandbox;
	serviceProvider: ServiceProvider;
};

describe<Context>("ServiceProvider", ({ assert, it, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.serviceProvider = context.sandbox.app.resolve(ServiceProvider);
	});

	it("should register all calculators", async ({ sandbox, serviceProvider }) => {
		await serviceProvider.register();

		assert.true(sandbox.app.isBound(Identifiers.BlockchainUtils.ProposerCalculator));
		assert.true(sandbox.app.isBound(Identifiers.BlockchainUtils.FeeCalculator));
		assert.true(sandbox.app.isBound(Identifiers.BlockchainUtils.RoundCalculator));
		assert.true(sandbox.app.isBound(Identifiers.BlockchainUtils.TimestampCalculator));
	});
});

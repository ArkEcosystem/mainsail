import { Container } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework";
import { Application } from "../../application";
import { MemoryLogger } from "./drivers/memory";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("LogServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});

	it("should register the service", async (context) => {
		assert.false(context.app.isBound(Identifiers.LogManager));
		assert.false(context.app.isBound(Identifiers.LogService));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.LogManager));
		assert.true(context.app.isBound(Identifiers.LogService));
	});

	it("should create an instance of the MemoryPipeline", async (context) => {
		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.instance(context.app.get<Contracts.Kernel.Logger>(Identifiers.LogService), MemoryLogger);
	});
});

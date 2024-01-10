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
		assert.false(context.app.isBound(Identifiers.Kernel.Log.Manager));
		assert.false(context.app.isBound(Identifiers.Kernel.Log.Service));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Kernel.Log.Manager));
		assert.true(context.app.isBound(Identifiers.Kernel.Log.Service));
	});

	it("should create an instance of the MemoryPipeline", async (context) => {
		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.instance(context.app.get<Contracts.Kernel.Logger>(Identifiers.Kernel.Log.Service), MemoryLogger);
	});
});

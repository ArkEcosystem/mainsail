import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework/source";
import { Application } from "../../application";
import { QueueFactory } from "../../types";
import { MemoryQueue } from "./drivers/memory";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("QueueServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue({});
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({});
	});

	it("should register the service", async (context) => {
		assert.false(context.app.isBound(Identifiers.Services.Queue.Factory));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Services.Queue.Factory));
	});

	it("should create an instance of the MemoryQueue", async (context) => {
		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.instance(await context.app.get<QueueFactory>(Identifiers.Services.Queue.Factory)(), MemoryQueue);
	});
});

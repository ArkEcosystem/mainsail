import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { Application } from "../../application";
import { QueueFactory } from "../../types";
import { MemoryQueue } from "./drivers/memory";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("QueueServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.EventDispatcherService).toConstantValue({});
		context.app.bind(Identifiers.LogService).toConstantValue({});
	});

	it("should register the service", async (context) => {
		assert.false(context.app.isBound(Identifiers.QueueFactory));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.QueueFactory));
	});

	it("should create an instance of the MemoryQueue", async (context) => {
		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.instance(await context.app.get<QueueFactory>(Identifiers.QueueFactory)(), MemoryQueue);
	});
});

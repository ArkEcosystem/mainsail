import { describe } from "../../../../core-test-framework";

import { Application } from "../../application";
import { Container, Identifiers } from "../../ioc";
import { ServiceProvider } from "./service-provider";
import { MemoryPipeline } from "./drivers/memory";
import { PipelineFactory } from "../../types";

describe<{
	app: Application;
}>("PipelineServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});
	it("should register the service", async (context) => {
		assert.false(context.app.isBound(Identifiers.PipelineFactory));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.PipelineFactory));
	});

	it("should create an instance of the MemoryPipeline", async (context) => {
		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.instance(context.app.get<PipelineFactory>(Identifiers.PipelineFactory)(), MemoryPipeline);
	});
});

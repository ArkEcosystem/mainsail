import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { Application } from "../../application";
import { MemoryPipeline } from "./drivers/memory";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
}>("PipelineServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application();
	});
	it("should register the service", async (context) => {
		assert.false(context.app.isBound(Identifiers.Services.Pipeline.Factory));

		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.true(context.app.isBound(Identifiers.Services.Pipeline.Factory));
	});

	it("should create an instance of the MemoryPipeline", async (context) => {
		await context.app.resolve<ServiceProvider>(ServiceProvider).register();

		assert.instance(
			context.app.get<Contracts.Kernel.PipelineFactory>(Identifiers.Services.Pipeline.Factory)(),
			MemoryPipeline,
		);
	});
});

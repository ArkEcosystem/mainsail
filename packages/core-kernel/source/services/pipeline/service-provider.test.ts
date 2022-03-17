import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { Application } from "../../application";
import { PipelineFactory } from "../../types";
import { MemoryPipeline } from "./drivers/memory";
import { ServiceProvider } from "./service-provider";

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

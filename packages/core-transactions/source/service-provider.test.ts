import { Container } from "@arkecosystem/core-container";
import { Application } from "@arkecosystem/core-kernel";

import { describe } from "../../core-test-framework/source";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
		context.serviceProvider = context.app.resolve<ServiceProvider>(ServiceProvider);
	});

	it("should register", async (context) => {
		await assert.resolves(() => context.serviceProvider.register());
	});

	it("should be required", async (context) => {
		assert.true(await context.serviceProvider.required());
	});
});

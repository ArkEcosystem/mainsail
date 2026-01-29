import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert, spy }) => {
	beforeEach((context) => {
		const app = new Application();

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should be ok", async ({ serviceProvider, app }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Database.Service));
	});

	it("#required - should be true", async ({ serviceProvider }) => {
		assert.true(await serviceProvider.required());
	});


	it("#boot - should initialize database service", async ({ app, serviceProvider }) => {
		const databaseService = {
			initialize: () => {}
		}
		app.bind(Identifiers.Database.Service).toConstantValue(databaseService);

		const spyInitialize = spy(databaseService, "initialize");

		await serviceProvider.boot();

		spyInitialize.calledOnce();
	});
});

import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const app = new Application();

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should be ok", async ({ serviceProvider, app }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Cryptography.Identity.Wif.Factory));
	});
});

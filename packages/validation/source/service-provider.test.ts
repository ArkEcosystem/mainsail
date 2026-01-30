import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";


describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert, stubFn }) => {
	beforeEach((context) => {
		const app = new Application();

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("should register", async (context) => {
		await assert.resolves(() => context.serviceProvider.register());

		assert.true(context.app.isBound(Identifiers.Cryptography.Validator))
	});

});

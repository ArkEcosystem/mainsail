import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("should be ok", async ({ serviceProvider, app }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Cryptography.Serializer));
	});

	it("should be required", async ({ serviceProvider }) => {
		assert.true(await serviceProvider.required());
	});
});

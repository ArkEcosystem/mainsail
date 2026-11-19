import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { defaults } from "./defaults";
import { ServiceProvider } from "./service-provider";

describe<{
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.serviceProvider = new Application().resolve(ServiceProvider);
	});

	it("#register - should register", async ({ serviceProvider }) => {
		await assert.resolves(() => serviceProvider.register());
	});

	it("#configSchema - should accept the defaults", ({ serviceProvider }) => {
		assert.undefined(serviceProvider.configSchema().validate(defaults).error);
	});
});

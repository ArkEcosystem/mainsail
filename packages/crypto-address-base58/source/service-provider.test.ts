import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";
import { Contracts } from "@mainsail/contracts";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	validator: Contracts.Crypto.Validator;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidationServiceProvider).register();

		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should be ok", async ({ serviceProvider, app, validator }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Cryptography.Legacy.Identity.AddressFactory));
		assert.true(validator.hasSchema("legacyAddress"));
	});
});

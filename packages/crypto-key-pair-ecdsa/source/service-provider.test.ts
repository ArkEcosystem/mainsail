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

		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.PublicKey.Size, "type", "wallet"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "wallet"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.PrivateKey.Factory, "type", "wallet"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.PublicKey.Factory, "type", "wallet"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.PublicKey.Serializer, "type", "wallet"));

		assert.true(validator.hasSchema("publicKey"));
	});
});

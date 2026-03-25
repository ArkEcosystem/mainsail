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
		const app = new Application();
		await app.resolve(ValidationServiceProvider).register();

		context.validator = app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should be ok", async ({ serviceProvider, app, validator }) => {
		await serviceProvider.register();

		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.PublicKey.Size, "type", "consensus"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.KeyPair.Factory, "type", "consensus"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.PrivateKey.Factory, "type", "consensus"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.PublicKey.Factory, "type", "consensus"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Identity.PublicKey.Serializer, "type", "consensus"));

		assert.true(validator.hasSchema("consensusPublicKey"));
	});
});

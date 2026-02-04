import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { Validator } from "@mainsail/validation";
import { schemas as baseSchemas } from "@mainsail/crypto-validation";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	validator: Validator;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const app = new Application();

		app.bind(Identifiers.Cryptography.Validator).to(Validator).inSingletonScope();
		context.validator = app.get<Validator>(Identifiers.Cryptography.Validator);

		for (const schema of Object.values(baseSchemas)) {
			context.validator.addSchema(schema);
		}

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should be ok", async ({ serviceProvider, app, validator }) => {
		await serviceProvider.register();

		assert.true(app.isBoundTagged(Identifiers.Cryptography.Signature.Size, "type", "consensus"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Signature.Instance, "type", "consensus"));
		assert.true(app.isBoundTagged(Identifiers.Cryptography.Signature.Serializer, "type", "consensus"));

		assert.true(validator.hasSchema("consensusSignature"));
	});
});

import { Identifiers } from "@mainsail/constants";

import { describe, Sandbox } from "@mainsail/test-framework";
import { ServiceProvider } from "./service-provider.js";

describe<{
	sandbox: Sandbox;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert, spy }) => {
	const validator = {
		addSchema: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Identifiers.Cryptography.Validator).toConstantValue(validator);

		context.serviceProvider = context.sandbox.app.resolve(ServiceProvider);
	});

	it("#register - should bind tagged and register schema", async ({ sandbox, serviceProvider }) => {
		const spyAddSchema = spy(validator, "addSchema");

		await serviceProvider.register();

		[
			Identifiers.Cryptography.Identity.PublicKey.Size,
			Identifiers.Cryptography.Signature.Size,
			Identifiers.Cryptography.Identity.KeyPair.Factory,
			Identifiers.Cryptography.Identity.PrivateKey.Factory,
			Identifiers.Cryptography.Identity.PublicKey.Factory,
			Identifiers.Cryptography.Identity.PublicKey.Serializer,
			Identifiers.Cryptography.Signature.Instance,
		].forEach((identifier) => assert.true(sandbox.app.isBoundTagged(identifier, "type", "consensus")));

		spyAddSchema.calledTimes(2);
	});
});

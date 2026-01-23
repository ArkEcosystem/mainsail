import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider.js";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
}>("ServiceProvider", ({ beforeEach, it, assert, spy }) => {
	const validator = {
		addSchema: () => {},
	};

	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Cryptography.Validator).toConstantValue(validator);

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("#register - should bind tagged and register schema", async ({ app, serviceProvider }) => {
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
		].forEach((identifier) => assert.true(app.isBoundTagged(identifier, "type", "consensus")));

		spyAddSchema.calledTimes(2);
	});
});

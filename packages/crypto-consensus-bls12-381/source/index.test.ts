import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework";
import { ServiceProvider } from "./index";

describe<{
	sandbox: Sandbox;
	serviceProvider: ServiceProvider;
}>("Index", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.serviceProvider = context.sandbox.app.resolve(ServiceProvider);
	});

	it("#register - should bind tagged", async ({ sandbox, serviceProvider }) => {
		await serviceProvider.register();

		[
			Identifiers.Cryptography.Size.PublicKey,
			Identifiers.Cryptography.Size.Signature,
			Identifiers.Cryptography.Identity.KeyPairFactory,
			Identifiers.Cryptography.Identity.PrivateKeyFactory,
			Identifiers.Cryptography.Identity.PublicKeyFactory,
			Identifiers.Cryptography.Identity.PublicKeySerializer,
			Identifiers.Cryptography.Signature,
		].forEach((identifier) => assert.true(sandbox.app.isBoundTagged(identifier, "type", "consensus")));
	});
});

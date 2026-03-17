import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { Validator } from "@mainsail/validation";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as SignatureBlsServiceProvider } from "@mainsail/crypto-signature-bls12-381";

import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	validator: Validator;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		const app = new Application();

		app.bind(Identifiers.Cryptography.Validator).to(Validator).inSingletonScope();
		context.validator = app.get<Validator>(Identifiers.Cryptography.Validator);

		await app.resolve(SignatureBlsServiceProvider).register();

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should be ok", async ({ serviceProvider, app }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Cryptography.Commit.Serializer));
		assert.true(app.isBound(Identifiers.Cryptography.Commit.Deserializer));
		assert.true(app.isBound(Identifiers.Cryptography.Commit.Factory));
		assert.true(app.isBound(Identifiers.Cryptography.Commit.ProofSize));

		const signatureSize = app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "consensus");
		const proofSize = app.get<() => number>(Identifiers.Cryptography.Commit.ProofSize);
		assert.equal(proofSize(), 4 + signatureSize + 1 + 8);
	});
});

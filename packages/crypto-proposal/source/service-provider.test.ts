import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { Validator } from "@mainsail/validation";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/crypto-validation";
import { ServiceProvider as SignatureBlsServiceProvider } from "@mainsail/crypto-signature-bls12-381";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	validator: Validator;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		const app = new Application();

		app.bind(Identifiers.Cryptography.Validator).to(Validator).inSingletonScope();
		context.validator = app.get<Validator>(Identifiers.Cryptography.Validator);

		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		await app.resolve(ValidationServiceProvider).register();
		await app.resolve(SignatureBlsServiceProvider).register();

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should be ok", async ({ serviceProvider, app, validator }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Cryptography.Proposal.Serializer));
		assert.true(app.isBound(Identifiers.Cryptography.Proposal.Deserializer));
		assert.true(app.isBound(Identifiers.Cryptography.Proposal.Factory));


		const lockProofSize = app.get<() => number>(Identifiers.Cryptography.Proposal.LockProofSize);
		assert.equal(lockProofSize(), 96 + 1 + 8);

		assert.true(validator.hasSchema("proposal"));
		assert.true(validator.hasSchema("lockProof"));
		assert.true(validator.hasSchema("validatorBitmap"));
	});
});

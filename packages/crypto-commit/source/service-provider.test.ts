import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { Validator } from "@mainsail/validation";
import { ServiceProvider as CryptoValidationServiceProvider } from "@mainsail/crypto-validation";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as SignatureBlsServiceProvider } from "@mainsail/crypto-signature-bls12-381";
import { ServiceProvider as TransactionServiceProvider } from "@mainsail/crypto-transaction";
import { ServiceProvider as AddressServiceProvider } from "@mainsail/crypto-address-keccak256";
import { ServiceProvider as KeyPairServiceProvider } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as HashBcryptoServiceProvider } from "@mainsail/crypto-hash-bcrypto";
import { ServiceProvider as BlockServiceProvider } from "@mainsail/crypto-block";

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

		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});

		await app.resolve(CryptoValidationServiceProvider).register();
		await app.resolve(SignatureBlsServiceProvider).register();

		await app.resolve(TransactionServiceProvider).register();
		await app.resolve(AddressServiceProvider).register();
		await app.resolve(KeyPairServiceProvider).register();
		await app.resolve(HashBcryptoServiceProvider).register();
		await app.resolve(BlockServiceProvider).register();

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should be ok", async ({ serviceProvider, app, validator }) => {
		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Cryptography.Commit.Serializer));
		assert.true(app.isBound(Identifiers.Cryptography.Commit.Deserializer));
		assert.true(app.isBound(Identifiers.Cryptography.Commit.Factory));
		assert.true(app.isBound(Identifiers.Cryptography.Commit.ProofSize));

		const signatureSize = app.getTagged<number>(Identifiers.Cryptography.Signature.Size, "type", "consensus");
		const proofSize = app.get<() => number>(Identifiers.Cryptography.Commit.ProofSize);
		assert.equal(proofSize(), 4 + signatureSize + 1 + 8);

		assert.true(validator.hasSchema("commitProof"));
		assert.true(validator.hasSchema("commit"));
	});
});

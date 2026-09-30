import { Identifiers } from "@mainsail/constants";
import { Contracts } from "@mainsail/contracts";
import { schemas as blockSchemas } from "@mainsail/crypto-block";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { schemas as keyPairBlsSchemas } from "@mainsail/crypto-key-pair-bls12-381";
import { schemas as signatureBlsSchemas } from "@mainsail/crypto-signature-bls12-381";
import { ServiceProvider as CryptoValidationServiceProvider } from "@mainsail/crypto-validation";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	validator: Contracts.Crypto.Validator;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		const app = new Application();

		app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);

		await app.resolve(ValidationServiceProvider).register();
		await app.resolve(CryptoConfigServiceProvider).register();

		context.validator = app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
		app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

		await app.resolve(CryptoValidationServiceProvider).register();

		// Register the referenced schemas (blockHash / consensusSignature) that the
		// `message` schema $refs, so that register() can compile it.
		for (const schema of Object.values({ ...blockSchemas, ...keyPairBlsSchemas, ...signatureBlsSchemas })) {
			context.validator.addSchema(schema);
		}

		context.serviceProvider = app.resolve(ServiceProvider);
		context.app = app;
	});

	it("#register - should bind the message crypto services and register the schema", async ({
		serviceProvider,
		app,
		validator,
	}) => {
		assert.false(app.isBound(Identifiers.Cryptography.Message.Serializer));
		assert.false(app.isBound(Identifiers.Cryptography.Message.Deserializer));
		assert.false(app.isBound(Identifiers.Cryptography.Message.Factory));
		assert.false(validator.hasSchema("message"));

		await serviceProvider.register();

		assert.true(app.isBound(Identifiers.Cryptography.Message.Serializer));
		assert.true(app.isBound(Identifiers.Cryptography.Message.Deserializer));
		assert.true(app.isBound(Identifiers.Cryptography.Message.Factory));

		assert.true(validator.hasSchema("message"));
	});
});

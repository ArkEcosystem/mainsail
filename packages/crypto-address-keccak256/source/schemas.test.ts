import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as ECDSA } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { generateMnemonic } from "bip39";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { AddressFactory } from "./address.factory";
import { schemas } from "./schemas";
import { Contracts } from "@mainsail/contracts";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	const length = 42;

	beforeEach(async (context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		await context.app.resolve(ValidationServiceProvider).register();

		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		for (const schema of Object.values({
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("address - should be ok", ({ validator }) => {
		const prefix = "0x";

		assert.undefined(validator.validate("address", prefix + "a".repeat(length - prefix.length)).error);

		const validChars = "0123456789abcdefABCDEF";

		for (const char of validChars) {
			assert.undefined(validator.validate("address", prefix + char.repeat(length - prefix.length)).error);
		}
	});

	it("address - should be ok for factory", async (context) => {
		await context.app.resolve<ECDSA>(ECDSA).register();

		assert.undefined(
			context.validator.validate(
				"address",
				await context.app.resolve(AddressFactory).fromMnemonic(generateMnemonic(256)),
			).error,
		);
	});

	it("address - should not be ok", ({ validator }) => {
		const prefix = "0x";
		const invalidPrefix = "1x";

		assert.defined(validator.validate("address", prefix + "a".repeat(length - 1 - prefix.length)).error);
		assert.defined(validator.validate("address", prefix + "a".repeat(length + 1 - prefix.length)).error);
		assert.defined(validator.validate("address", 123).error);
		assert.defined(validator.validate("address", null).error);
		assert.defined(validator.validate("address").error);
		assert.defined(validator.validate("address", {}).error);

		const invalidChars = "GHJKLMNPQRSTUVWXYZ!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("address", prefix + char.repeat(length - prefix.length)).error);
		}

		assert.defined(validator.validate("address", invalidPrefix + "a".repeat(length - invalidPrefix.length)).error);
	});
});

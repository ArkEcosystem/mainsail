import { Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as Schnorr } from "@mainsail/crypto-key-pair-schnorr";
import { schemas as baseSchemas } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";
import { Validator } from "@mainsail/validation/source/validator";
import { generateMnemonic } from "bip39";

import cryptoJson from "../../core/bin/config/testnet/core/crypto.json";
import { describe, Sandbox } from "../../test-framework/source";
import { AddressFactory } from "./address.factory";
import { schemas } from "./schemas";

describe<{
	sandbox: Sandbox;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	const length = 48;

	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		await context.sandbox.app.resolve(CoreValidation).register();

		context.validator = context.sandbox.app.get(Identifiers.Cryptography.Validator);

		for (const schema of Object.values({
			...baseSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("address - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("address", "a".repeat(length)).error);

		const validChars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

		for (const char of validChars) {
			assert.undefined(validator.validate("address", char.repeat(length)).error);
		}
	});

	it("address - should be ok for factory", async (context) => {
		await context.sandbox.app.resolve<Schnorr>(Schnorr).register();

		assert.undefined(
			context.validator.validate(
				"address",
				await context.sandbox.app.resolve(AddressFactory).fromMnemonic(generateMnemonic(256)),
			).error,
		);
	});

	it("address - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("address", "a".repeat(length - 1)).error);
		assert.defined(validator.validate("address", "a".repeat(length + 1)).error);
		assert.defined(validator.validate("address", 123).error);
		assert.defined(validator.validate("address", null).error);
		assert.defined(validator.validate("address").error);
		assert.defined(validator.validate("address", {}).error);

		const invalidChars = "!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("address", char.repeat(length)).error);
		}
	});
});

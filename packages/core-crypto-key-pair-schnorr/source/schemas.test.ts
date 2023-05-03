import { Identifiers } from "@mainsail/contracts";
import { Configuration } from "@mainsail/core-crypto-config";
import { schemas as baseSchemas } from "@mainsail/core-crypto-validation";
import { Validator } from "@mainsail/core-validation/source/validator";
import { generateMnemonic } from "bip39";

import cryptoJson from "../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../core-test-framework";
import { KeyPairFactory } from "./pair";
import { schemas } from "./schemas";

describe<{
	sandbox: Sandbox;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.validator = context.sandbox.app.resolve(Validator);

		for (const schema of Object.values({
			...baseSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("publicKey - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("publicKey", "0".repeat(64)).error);

		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("publicKey", char.repeat(64)).error);
		}
	});

	it("publicKey - should be ok from key pair factory", async (context) => {
		const kayPair = await context.sandbox.app.resolve(KeyPairFactory).fromMnemonic(generateMnemonic(256));

		assert.undefined(context.validator.validate("publicKey", kayPair.publicKey).error);
	});

	it("publicKey - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("publicKey", "0".repeat(63)).error);
		assert.defined(validator.validate("publicKey", "0".repeat(65)).error);
		assert.defined(validator.validate("publicKey", 123).error);
		assert.defined(validator.validate("publicKey", null).error);
		assert.defined(validator.validate("publicKey").error);
		assert.defined(validator.validate("publicKey", {}).error);

		const invalidChars = "ABCDEFGHIJKLghijkl!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("publicKey", char.repeat(64)).error);
		}
	});
});

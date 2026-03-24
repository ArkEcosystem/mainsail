import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as ValidatorServiceProvider } from "@mainsail/validation";
import { generateMnemonic } from "bip39";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { KeyPairFactory } from "./pair";
import { schemas } from "./schemas";
import { Contracts } from "@mainsail/contracts";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	const length = 66;

	beforeEach(async (context) => {
		context.app = new Application();
		await context.app.resolve(ValidatorServiceProvider).register();
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		for (const schema of Object.values({
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("publicKey - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("publicKey", "0".repeat(length)).error);

		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("publicKey", char.repeat(length)).error);
		}
	});

	it("publicKey - should be ok from key pair factory", async (context) => {
		const kayPair = await context.app.resolve(KeyPairFactory).fromMnemonic(generateMnemonic(256));

		assert.undefined(context.validator.validate("publicKey", kayPair.publicKey).error);
	});

	it("publicKey - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("publicKey", "0".repeat(length - 1)).error);
		assert.defined(validator.validate("publicKey", "0".repeat(length + 1)).error);
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

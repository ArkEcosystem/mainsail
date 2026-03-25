import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
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
	const length = 96;

	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		for (const schema of Object.values({
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("publicKey - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("consensusPublicKey", "0".repeat(length)).error);

		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("consensusPublicKey", char.repeat(length)).error);
		}
	});

	it("publicKey - should be ok from key pair factory", async (context) => {
		const kayPair = await context.app.resolve(KeyPairFactory).fromMnemonic(generateMnemonic(256));

		assert.undefined(context.validator.validate("consensusPublicKey", kayPair.publicKey).error);
	});

	it("publicKey - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("consensusPublicKey", "0".repeat(length - 1)).error);
		assert.defined(validator.validate("consensusPublicKey", "0".repeat(length + 1)).error);
		assert.defined(validator.validate("consensusPublicKey", 123).error);
		assert.defined(validator.validate("consensusPublicKey", null).error);
		assert.defined(validator.validate("consensusPublicKey").error);
		assert.defined(validator.validate("consensusPublicKey", {}).error);

		const invalidChars = "ABCDEFGHIJKLghijkl!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("consensusPublicKey", char.repeat(64)).error);
		}
	});
});

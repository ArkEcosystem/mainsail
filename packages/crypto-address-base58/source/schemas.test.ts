import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { ServiceProvider as ECDSA } from "@mainsail/crypto-key-pair-ecdsa";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { ServiceProvider as CryptoHashBcrypto } from "@mainsail/crypto-hash-bcrypto";
import { generateMnemonic } from "bip39";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { AddressFactory } from "./address.factory";
import { schemas } from "./schemas";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	const length = 34;

	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		await context.app.resolve(CryptoHashBcrypto).register();

		for (const schema of Object.values({
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("address - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("legacyAddress", "a".repeat(length)).error);

		const validChars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

		for (const char of validChars) {
			assert.undefined(validator.validate("legacyAddress", char.repeat(length)).error);
		}
	});

	it("address - should be ok for factory", async (context) => {
		await context.app.resolve<ECDSA>(ECDSA).register();

		assert.undefined(
			context.validator.validate(
				"legacyAddress",
				await context.app.resolve(AddressFactory).fromMnemonic(generateMnemonic(256)),
			).error,
		);
	});

	it("address - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("legacyAddress", "a".repeat(length - 2)).error);
		assert.defined(validator.validate("legacyAddress", "a".repeat(length + 1)).error);
		assert.defined(validator.validate("legacyAddress", 123).error);
		assert.defined(validator.validate("legacyAddress", null).error);
		assert.defined(validator.validate("legacyAddress").error);
		assert.defined(validator.validate("legacyAddress", {}).error);

		const invalidChars = "!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("legacyAddress", char.repeat(length)).error);
		}
	});
});

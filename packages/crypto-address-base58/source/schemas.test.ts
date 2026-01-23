import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { ServiceProvider as Schnorr } from "@mainsail/crypto-key-pair-schnorr";
import { schemas as baseSchemas } from "@mainsail/crypto-validation";
import { ServiceProvider as CoreValidation } from "@mainsail/validation";
import { Validator } from "@mainsail/validation/source/validator";
import { generateMnemonic } from "bip39";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { AddressFactory } from "./address.factory";
import { schemas } from "./schemas";

describe<{
	app: Application;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	const length = 34;

	beforeEach(async (context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);
		context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration).setConfig({
			genesisBlock: {
				// @ts-ignore
				block: {
					height: 0,
				},
			},
			milestones: [
				// @ts-ignore
				{
					address: {
						base58: 23,
					},
				},
			],
		});

		await context.app.resolve(CoreValidation).register();

		context.validator = context.app.get(Identifiers.Cryptography.Validator);

		for (const schema of Object.values({
			...baseSchemas,
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
		await context.app.resolve<Schnorr>(Schnorr).register();

		assert.undefined(
			context.validator.validate(
				"legacyAddress",
				await context.app.resolve(AddressFactory).fromMnemonic(generateMnemonic(256)),
			).error,
		);
	});

	it("address - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("legacyAddress", "a".repeat(length - 1)).error);
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

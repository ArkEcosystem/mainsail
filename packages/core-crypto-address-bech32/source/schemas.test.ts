import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { ServiceProvider as Schnorr } from "@arkecosystem/core-crypto-key-pair-schnorr";
import { schemas as baseSchemas } from "@arkecosystem/core-crypto-validation";
import { ServiceProvider as CoreValidation } from "@arkecosystem/core-validation";
import { Validator } from "@arkecosystem/core-validation/source/validator";
import { generateMnemonic } from "bip39";

import cryptoJson from "../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../core-test-framework";
import { AddressFactory } from "./address.factory";
import { makeSchemas } from "./schemas";

describe<{
	sandbox: Sandbox;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	const minLength = 62;
	const maxLength = 63;

	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.setConfig(cryptoJson);

		context.sandbox.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration).setConfig({
			milestones: [
				// @ts-ignore
				{
					address: {
						bech32: "mod",
					},
				},
			],
		});

		await context.sandbox.app.resolve(CoreValidation).register();

		context.validator = context.sandbox.app.get(Identifiers.Cryptography.Validator);

		for (const schema of Object.values({
			...baseSchemas,
			...makeSchemas(
				context.sandbox.app.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration),
			),
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("address - should be ok", ({ validator }) => {
		const prefix = "mod";
		const validChars = "0123456789abcdefghijklmnopqrstuvwxyz";

		for (const char of validChars) {
			assert.undefined(validator.validate("address", prefix + char.repeat(minLength - prefix.length)).error);
			assert.undefined(validator.validate("address", prefix + char.repeat(maxLength - prefix.length)).error);
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
		const prefix = "mod";
		const invalidPrefix = "inv";

		assert.defined(validator.validate("address", prefix + "a".repeat(minLength - 1 - prefix.length)).error);
		assert.defined(validator.validate("address", prefix + "a".repeat(maxLength + 1 - prefix.length)).error);
		assert.defined(validator.validate("address", 123).error);
		assert.defined(validator.validate("address", null).error);
		assert.defined(validator.validate("address").error);
		assert.defined(validator.validate("address", {}).error);

		const invalidChars = "ABCDEFGHJKLMNPQRSTUVWXYZ!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("address", prefix + char.repeat(minLength - prefix.length)).error);
		}

		// Invalid prefix
		assert.defined(
			validator.validate("address", invalidPrefix + "a".repeat(minLength - invalidPrefix.length)).error,
		);
	});
});

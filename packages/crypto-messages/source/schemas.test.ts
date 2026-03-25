import { Identifiers } from "@mainsail/constants";
import { schemas as blockSchemas } from "@mainsail/crypto-block";
import { schemas as keyPairBlsSchemas } from "@mainsail/crypto-key-pair-bls12-381";
import { schemas as signatureBlsSchemas } from "@mainsail/crypto-signature-bls12-381";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";
import { ServiceProvider as CryptoValidationServiceProvider } from "@mainsail/crypto-validation";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { prevoteData, prevoteDataNoBlock } from "../test/fixtures/index.js";
import { schemas } from "./schemas";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
	configuration: Contracts.Crypto.Configuration;
}>("Schemas", ({ it, assert, beforeEach, spy }) => {
	beforeEach(async (context) => {
		context.app = new Application();

		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();

		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
		context.configuration = context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration);
		context.configuration.setHeight(1); // Required by schema to set number for validators

		await context.app.resolve(CryptoValidationServiceProvider).register();

		for (const schema of Object.values({
			...blockSchemas,
			...keyPairBlsSchemas,
			...signatureBlsSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("message - should be ok", async ({ validator }) => {
		const result = validator.validate("message", prevoteData);
		assert.undefined(result.error);
	});

	it("message - should be ok without block", async ({ validator }) => {
		const result = validator.validate("message", prevoteDataNoBlock);
		assert.undefined(result.error);
	});

	it("message - should throw for invalid blockHash", async ({ validator }) => {
		const values = [-1, 1, "1", "invalidHash", [], {}, null, "a".repeat(63), "a".repeat(65)];

		for (const value of values) {
			const result = validator.validate("message", { ...prevoteData, blockHash: value });

			assert.defined(result.error);
			assert.true(result.error!.includes("blockHash"));
		}
	});

	it("message - should throw for invalid blockNumber", async ({ validator }) => {
		const values = [-1, 0, "0", "1", "invalidBlockNumber", [], {}, null, undefined];

		for (const value of values) {
			const result = validator.validate("message", { ...prevoteData, blockNumber: value });

			assert.defined(result.error);
			assert.true(result.error!.includes("blockNumber"));
		}
	});

	it("message - should throw for invalid round", async ({ validator }) => {
		const values = [-1, "0", "1", "invalidRound", [], {}, null, undefined];

		for (const value of values) {
			const result = validator.validate("message", { ...prevoteData, round: value });

			assert.defined(result.error);
			assert.true(result.error!.includes("round"));
		}
	});

	it("message - should throw for invalid signature", async ({ validator }) => {
		const values = [
			-1,
			"0",
			"1",
			"invalidSignature",
			[],
			{},
			null,
			undefined,
			"a".repeat(191),
			"a".repeat(193),
			"g".repeat(192),
		];

		for (const value of values) {
			const result = validator.validate("message", { ...prevoteData, signature: value });

			assert.defined(result.error);
			assert.true(result.error!.includes("signature"));
		}
	});

	it("message - should throw for invalid type", async ({ validator }) => {
		const values = [0, 3, -1, "0", "1", "invalidType", [], {}, null, undefined];

		for (const value of values) {
			const result = validator.validate("message", { ...prevoteData, type: value });

			assert.defined(result.error);
			assert.true(result.error!.includes("type"));
		}
	});

	it("message - should throw for invalid validatorIndex", async ({ validator }) => {
		const values = [-1, 53, "0", "1", "invalidValidatorIndex", [], {}, null, undefined];

		for (const value of values) {
			const result = validator.validate("message", { ...prevoteData, validatorIndex: value });

			assert.defined(result.error);
			assert.true(result.error!.includes("validatorIndex"));
		}
	});

	it("message - should throw for invalid type", async ({ validator }) => {
		const values = [-1, "0", "invalidValidatorIndex", [], {}, null, undefined];

		for (const value of values) {
			const result = validator.validate("message", value);

			assert.defined(result.error);
		}
	});

	it("message - should throw with extra fields", async ({ validator }) => {
		const result = validator.validate("message", { ...prevoteData, extraField: 123 });
		assert.defined(result.error);
	});

	it("message - should correctly parse block number", async ({ validator, configuration }) => {
		const spyGetMilestone = spy(configuration, "getMilestone");

		const result = validator.validate("message", { ...prevoteData, blockNumber: 3 });
		assert.undefined(result.error);

		spyGetMilestone.calledOnce();
		spyGetMilestone.calledWith(3);
	});
});

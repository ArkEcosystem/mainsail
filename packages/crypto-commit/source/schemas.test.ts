import { Identifiers } from "@mainsail/constants";
import { schemas as blockSchemas } from "@mainsail/crypto-block";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as signatureBlsSchemas } from "@mainsail/crypto-signature-bls12-381";
import { schemas as transactionSchemas } from "@mainsail/crypto-transaction/source/validation/index.js";
import { makeKeywords as makeBaseKeywords, schemas as baseSchemas } from "@mainsail/crypto-validation";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { blockData, commitProof1, commitProof2, commitSerialized } from "../test/fixtures/index.js";
import { schemas } from "./schemas";

describe<{
	app: Application;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

		context.validator = context.app.resolve(Validator);

		for (const keyword of Object.values({
			...makeBaseKeywords(context.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
			...baseSchemas,
			...blockSchemas,
			...signatureBlsSchemas,
			...transactionSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("commit - should be ok", ({ validator }) => {
		const result = validator.validate("commit", {
			block: blockData,
			proof: commitProof1,
			serialized: commitSerialized,
		});
		assert.undefined(result.error);
	});

	it("commit - should not allow additional fields", ({ validator }) => {
		const result = validator.validate("commit", {
			block: blockData,
			proof: commitProof1,
			serialized: commitSerialized,
			extraField: "extraValue",
		});
		assert.defined(result.error);
		assert.true(result.error!.includes("additional properties"));
	});

	it("commit - all fields are required", ({ validator }) => {
		const keys = Object.keys(schemas.commit.properties);
		for (const key of keys) {
			const commitCopy = { block: blockData, proof: commitProof1, serialized: commitSerialized, [key]: undefined };
			const result = validator.validate("commit", commitCopy);
			assert.defined(result.error);
			assert.true(result.error?.includes(key));
		}
	});

	it("commitProof - should be ok", ({ validator }) => {
		const result1 = validator.validate("commitProof", commitProof1);
		assert.undefined(result1.error);
		const result2 = validator.validate("commitProof", commitProof2);
		assert.undefined(result2.error);
	});

	it("commitProof - should not allow additional fields", ({ validator }) => {
		const commitProofCopy = { ...commitProof1, extraField: "extraValue" };
		const result = validator.validate("commitProof", commitProofCopy);
		assert.defined(result.error);
		assert.true(result.error!.includes("additional properties"));
	});

	it("commitProof - all fields are required", ({ validator }) => {
		const keys = Object.keys(schemas.commitProof.properties);
		for (const key of keys) {
			const commitProofCopy = { ...commitProof1, [key]: undefined };
			const result = validator.validate("commitProof", commitProofCopy);
			assert.defined(result.error);
			assert.true(result.error?.includes(key));
		}
	});

	it("commitProof - round should be ok", ({ validator }) => {
		const validRounds = [0, 1, 10, 100, 1000];
		for (const round of validRounds) {
			const commitProofCopy = { ...commitProof1, round };
			const result = validator.validate("commitProof", commitProofCopy);
			assert.undefined(result.error);
		}

		const invalidRounds = [-1, -10, 1.5, "1", null, undefined];
		for (const round of invalidRounds) {
			const commitProofCopy = { ...commitProof1, round };
			const result = validator.validate("commitProof", commitProofCopy);
			assert.defined(result.error);
			assert.true(result.error!.includes("round"));
		}
	});

	it("commitProof - signature should be ok", ({ validator }) => {
		for (const char of "0123456789abcdef") {
			const commitProofCopy = { ...commitProof1, signature: char.repeat(192) };
			const result = validator.validate("commitProof", commitProofCopy);
			assert.undefined(result.error);
		}

		const invalidSignatures = [
			"0".repeat(191),
			"0".repeat(193),
			"g".repeat(192),
			"0".repeat(191) + "g",
			...["A", "B", "C", "D", "E", "F"].map((char) => char.repeat(192)),
		];
		for (const signature of invalidSignatures) {
			const commitProofCopy = { ...commitProof1, signature };
			const result = validator.validate("commitProof", commitProofCopy);
			assert.defined(result.error);
			assert.true(result.error!.includes("signature"));
		}
	});

	it("commitProof - validators should be ok", ({ validator }) => {
		const NUMBER_OF_VALIDATORS = 53;

		const validValidators = [
			Array(NUMBER_OF_VALIDATORS).fill(true),
			Array(NUMBER_OF_VALIDATORS).fill(false),
			[...Array(20).fill(true), ...Array(33).fill(false)],
		];

		for (const validators of validValidators) {
			const commitProofCopy = { ...commitProof1, validators };
			const result = validator.validate("commitProof", commitProofCopy);
			assert.undefined(result.error);
		}

		const invalidValidators = [
			Array(NUMBER_OF_VALIDATORS - 1).fill(true),
			Array(NUMBER_OF_VALIDATORS + 1).fill(true),
			Array(NUMBER_OF_VALIDATORS).fill(1),
			Array(NUMBER_OF_VALIDATORS).fill(0),
			Array(NUMBER_OF_VALIDATORS).fill(undefined),
			Array(NUMBER_OF_VALIDATORS).fill("a"),
			Array(NUMBER_OF_VALIDATORS).fill({}),
			Array(NUMBER_OF_VALIDATORS).fill(null),
		];
		for (const validators of invalidValidators) {
			const commitProofCopy = { ...commitProof1, validators };
			const result = validator.validate("commitProof", commitProofCopy);
			assert.defined(result.error);
			assert.true(result.error!.includes("validators"));
		}
	});
});

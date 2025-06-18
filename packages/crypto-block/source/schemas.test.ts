import { Identifiers } from "@mainsail/contracts";
import { schemas as addressSchemas } from "@mainsail/crypto-address-keccak256";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as keyPairSchemas } from "@mainsail/crypto-key-pair-ecdsa";
import { schemas as transactionSchemas } from "@mainsail/crypto-transaction";
import { makeKeywords, schemas as sharedSchemas } from "@mainsail/crypto-validation";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { describe, Sandbox } from "../../test-framework/source";
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

		for (const keyword of Object.values({
			...makeKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
			...sharedSchemas,
			...addressSchemas,
			...keyPairSchemas,
			...transactionSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("blockHash - should be ok", ({ validator }) => {
		const lenght = 64;
		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("blockHash", char.repeat(lenght)).error);
		}
	});

	it("blockHash - should not be ok", ({ validator }) => {
		const lenght = 64;
		const invalidChars = "ABCDEFGHIJKLMNOghijklmno$%!+-";

		for (const char of invalidChars) {
			assert.defined(validator.validate("blockHash", char.repeat(lenght)).error);
		}

		assert.defined(validator.validate("blockHash", "a".repeat(lenght - 1)).error);
		assert.defined(validator.validate("blockHash", "a".repeat(lenght + 1)).error);
	});

	const blockOriginal = {
		blockSignature: "123",
		proposer: "0x" + "A".repeat(40),
		number: 0,
		hash: "1".repeat(64),
		transactionsCount: 0,
		payloadSize: 0,
		transactionsRoot: "123",
		parentHash: "0".repeat(64),
		reward: 0,
		stateRoot: "0".repeat(64),
		logsBloom: "0".repeat(512),
		timestamp: 0,
		fee: 0,
		gasUsed: 0,
		version: 1,
	};

	it("blockHeader - should be ok", async ({ validator }) => {
		const block = {
			...blockOriginal,
		};

		assert.undefined(validator.validate("blockHeader", block).error);
	});

	it("blockHeader - should not be ok if any required field is missing", ({ validator }) => {
		const requiredFields = [
			"fee",
			"gasUsed",
			"hash",
			"logsBloom",
			"number",
			"parentHash",
			"payloadSize",
			"proposer",
			"reward",
			"stateRoot",
			"timestamp",
			"transactionsCount",
			"transactionsRoot",
			"version",
		];

		for (const field of requiredFields) {
			const blockWithoutField = { ...blockOriginal };

			delete blockWithoutField[field];

			assert.defined(validator.validate("blockHeader", blockWithoutField).error);
		}
	});

	it("blockHeader - proposer should be publicKey", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					proposer: "a".repeat(63),
				})
				.error.includes("proposer"),
		);

		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					proposer: "a".repeat(65),
				})
				.error.includes("proposer"),
		);
	});

	it("blockHeader - number should be integer & min 0", ({ validator }) => {
		// Integer OK
		for (const number of [0, 1, 2]) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					number,
				}).error,
			);
		}

		// NOT OK
		for (const number of ["0", "1", 0.12, 1.234, -1, -0.23, null, undefined]) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						number,
					})
					.error.includes("number"),
			);
		}
	});

	it("blockHeader - hash should be blockHash", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					hash: "1",
				})
				.error.includes("hash"),
		);
	});

	it("blockHeader - transactionsCount should be integer & min 0", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					transactionsCount: "1",
				})
				.error.includes("transactionsCount"),
		);

		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					transactionsCount: -1,
				})
				.error.includes("transactionsCount"),
		);
	});

	it("blockHeader - transactionsRoot should be hex", ({ validator }) => {
		const block = {
			...blockOriginal,
			transactionsRoot: "GHIJK",
		};

		assert.true(validator.validate("blockHeader", block).error.includes("transactionsRoot"));
	});

	it("blockHeader - payloadSize should be integer & min 0", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					payloadSize: "1",
				})
				.error.includes("payloadSize"),
		);

		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					payloadSize: -1,
				})
				.error.includes("payloadSize"),
		);
	});

	it("blockHeader - parentHash should be blockHash", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					parentHash: "1",
				})
				.error.includes("parentHash"),
		);
	});

	it("blockHeader - reward should be bigNumber & min 0", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					reward: "-1",
				})
				.error.includes("reward"),
		);
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					reward: -1,
				})
				.error.includes("reward"),
		);
	});

	it("blockHeader - timestamp should be integer & min 0", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					timestamp: "1",
				})
				.error.includes("timestamp"),
		);

		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					timestamp: -1,
				})
				.error.includes("timestamp"),
		);
	});

	it("blockHeader - fee should be bigNumber & min 0", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					fee: -1,
				})
				.error.includes("fee"),
		);
	});

	it("blockHeader - version should be 1", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					version: 0,
				})
				.error.includes("version"),
		);

		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					version: 2,
				})
				.error.includes("version"),
		);
	});

	it("block - transactions count should be equal transactionsCount", ({ validator }) => {
		validator.addSchema({
			$id: "transactions",
			type: "array",
		});

		assert.undefined(
			validator.validate("block", { ...blockOriginal, transactionsCount: 2, transactions: [{}, {}] }).error,
		);

		assert.defined(
			validator.validate("block", { ...blockOriginal, transactionsCount: 2, transactions: [{}] }).error,
		);

		assert.defined(
			validator.validate("block", { ...blockOriginal, transactionsCount: 2, transactions: [{}, {}, {}] }).error,
		);
	});
});

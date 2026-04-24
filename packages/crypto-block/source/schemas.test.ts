import { Identifiers } from "@mainsail/constants";
import { schemas as addressSchemas } from "@mainsail/crypto-address-keccak256";
import { schemas as keyPairSchemas } from "@mainsail/crypto-key-pair-ecdsa";
import { schemas as transactionSchemas } from "@mainsail/crypto-transaction";
import { makeKeywords } from "@mainsail/crypto-validation";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";

import cryptoJson from "../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Contracts } from "@mainsail/contracts";
import { schemas } from "./schemas";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		for (const keyword of Object.values({
			...makeKeywords(context.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
			...addressSchemas,
			...keyPairSchemas,
			...transactionSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("blockHash - should be ok", ({ validator }) => {
		const length = 64;
		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("blockHash", char.repeat(length)).error);
		}
	});

	it("blockHash - should not be ok", ({ validator }) => {
		const length = 64;
		const invalidChars = "ABCDEFGHIJKLMNOghijklmno$%!+-";

		for (const char of invalidChars) {
			assert.defined(validator.validate("blockHash", char.repeat(length)).error);
		}

		assert.defined(validator.validate("blockHash", "a".repeat(length - 1)).error);
		assert.defined(validator.validate("blockHash", "a".repeat(length + 1)).error);
	});

	it("prefixedBlockHash - should be ok", ({ validator }) => {
		const length = 64;
		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("prefixedBlockHash", "0x" + char.repeat(length)).error);
		}
	});

	it("prefixedBlockHash - should not be ok", ({ validator }) => {
		const length = 64;
		const invalidChars = "ABCDEFGHIJKLMNOghijklmno$%!+-";

		for (const char of invalidChars) {
			assert.defined(validator.validate("prefixedBlockHash", "0x" + char.repeat(length)).error);
		}

		assert.defined(validator.validate("prefixedBlockHash", "0x" + "a".repeat(length - 1)).error);
		assert.defined(validator.validate("prefixedBlockHash", "0x" + "a".repeat(length + 1)).error);
	});

	it("logsBloom - should be ok", ({ validator }) => {
		const length = 512;
		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("logsBloom", char.repeat(length)).error);
		}
	});

	it("logsBloom - should not be ok", ({ validator }) => {
		const length = 512;
		const invalidChars = "ABCDEFGHIJKLMNOghijklmno$%!+-";

		for (const char of invalidChars) {
			assert.defined(validator.validate("logsBloom", char.repeat(length)).error);
		}

		assert.defined(validator.validate("logsBloom", "a".repeat(length - 1)).error);
		assert.defined(validator.validate("logsBloom", "a".repeat(length + 1)).error);
	});

	it("stateRoot - should be ok", ({ validator }) => {
		const length = 64;
		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("stateRoot", char.repeat(length)).error);
		}
	});

	it("stateRoot - should not be ok", ({ validator }) => {
		const length = 64;
		const invalidChars = "ABCDEFGHIJKLMNOghijklmno$%!+-";

		for (const char of invalidChars) {
			assert.defined(validator.validate("stateRoot", char.repeat(length)).error);
		}

		assert.defined(validator.validate("stateRoot", "a".repeat(length - 1)).error);
		assert.defined(validator.validate("stateRoot", "a".repeat(length + 1)).error);
	});

	it("transactionsRoot - should be ok", ({ validator }) => {
		const length = 64;
		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("transactionsRoot", char.repeat(length)).error);
		}
	});

	it("transactionsRoot - should not be ok", ({ validator }) => {
		const length = 64;
		const invalidChars = "ABCDEFGHIJKLMNOghijklmno$%!+-";

		for (const char of invalidChars) {
			assert.defined(validator.validate("transactionsRoot", char.repeat(length)).error);
		}

		assert.defined(validator.validate("transactionsRoot", "a".repeat(length - 1)).error);
		assert.defined(validator.validate("transactionsRoot", "a".repeat(length + 1)).error);
	});

	/* eslint-disable perfectionist/sort-objects */
	const blockOriginal = {
		hash: "1".repeat(64),
		version: 1,
		timestamp: 0,
		number: 0,
		round: 0,
		parentHash: "0".repeat(64),
		stateRoot: "0".repeat(64),
		logsBloom: "0".repeat(512),
		transactionsCount: 0,
		gasUsed: 0,
		fee: 0n,
		reward: 0n,
		payloadSize: 0,
		transactionsRoot: "0".repeat(64),
		proposer: "0x" + "A".repeat(40),
	};
	/* eslint-enable perfectionist/sort-objects */

	it("blockHeader - should be ok", async ({ validator }) => {
		const block = {
			...blockOriginal,
		};

		assert.undefined(validator.validate("blockHeader", block).error);
	});

	it("blockHeader - should not be ok if any required field is missing", ({ validator }) => {
		const requiredFields = [
			"hash",
			"version",
			"timestamp",
			"number",
			"round",
			"parentHash",
			"stateRoot",
			"logsBloom",
			"transactionsCount",
			"gasUsed",
			"fee",
			"reward",
			"payloadSize",
			"transactionsRoot",
			"proposer",
		];

		for (const field of requiredFields) {
			const blockWithoutField = { ...blockOriginal };

			delete blockWithoutField[field];

			assert.true(validator.validate("blockHeader", blockWithoutField).error?.includes(field) ?? false);
		}
	});

	it("blockHeader - hash should be blockHash", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					hash: "1",
				})
				.error!.includes("hash"),
		);
	});

	it("blockHeader - version should be 1", ({ validator }) => {
		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					version: 0,
				})
				.error!.includes("version"),
		);

		assert.true(
			validator
				.validate("blockHeader", {
					...blockOriginal,
					version: 2,
				})
				.error!.includes("version"),
		);
	});

	it("blockHeader - timestamp should be integer & min 0", ({ validator }) => {
		// OK
		const validValues = [0, 1, 2];
		for (const timestamp of validValues) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					timestamp,
				}).error,
			);
		}

		// Not Ok
		const invalidValues = ["0", "1", 0.12, 1.234, -1, -0.23, null, undefined];
		for (const timestamp of invalidValues) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						timestamp,
					})
					.error!.includes("timestamp"),
			);
		}
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
					.error!.includes("number"),
			);
		}
	});

	it("blockHeader - round should be integer & min 0", ({ validator }) => {
		// Integer OK
		for (const round of [0, 1, 2]) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					round,
				}).error,
			);
		}

		// NOT OK
		for (const round of ["0", "1", 0.12, 1.234, -1, -0.23, null, undefined]) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						round,
					})
					.error!.includes("round"),
			);
		}
	});

	it("blockHeader - parentHash should be blockHash", ({ validator }) => {
		const validValues = ["0".repeat(64), "1".repeat(64)];
		for (const parentHash of validValues) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					parentHash,
				}).error,
			);
		}

		const invalidValues = ["1", "0".repeat(63), "0".repeat(65), "GHIJK"];
		for (const parentHash of invalidValues) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						parentHash,
					})
					.error!.includes("parentHash"),
			);
		}
	});

	it("blockHeader - stateRoot should be hex", ({ validator }) => {
		const validValues = ["0".repeat(64), "1".repeat(64)];
		for (const stateRoot of validValues) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					stateRoot,
				}).error,
			);
		}

		const invalidValues = ["1", "0".repeat(63), "0".repeat(65), "GHIJK"];
		for (const stateRoot of invalidValues) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						stateRoot,
					})
					.error!.includes("stateRoot"),
			);
		}
	});

	it("blockHeader - logsBloom should be hex", ({ validator }) => {
		const validValues = ["0".repeat(512), "1".repeat(512)];
		for (const logsBloom of validValues) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					logsBloom,
				}).error,
			);
		}

		const invalidValues = ["1", "0".repeat(511), "0".repeat(513), "GHIJK"];
		for (const logsBloom of invalidValues) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						logsBloom,
					})
					.error!.includes("logsBloom"),
			);
		}
	});

	it("blockHeader - transactionsCount should be integer & min 0", ({ validator }) => {
		// Integer OK
		for (const transactionsCount of [0, 1, 2]) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					transactionsCount,
				}).error,
			);
		}

		// NOT OK
		for (const transactionsCount of ["0", "1", 0.12, 1.234, -1, -0.23, null, undefined]) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						transactionsCount,
					})
					.error!.includes("transactionsCount"),
			);
		}
	});

	it("blockHeader - gasUsed should be integer & min 0", ({ validator }) => {
		// Integer OK
		for (const gasUsed of [0, 1, 2]) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					gasUsed,
				}).error,
			);
		}

		// NOT OK
		for (const gasUsed of ["0", "1", 0.12, 1.234, -1, -0.23, null, undefined]) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						gasUsed,
					})
					.error!.includes("gasUsed"),
			);
		}
	});

	it("blockHeader - fee should be bigInt & min 0", ({ validator }) => {
		// Integer OK
		for (const fee of [0n, 1n, 2n]) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					fee,
				}).error,
			);
		}

		// NOT OK
		for (const fee of [0, 1, "0", "1", -1n, null, undefined]) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						fee,
					})
					.error!.includes("fee"),
			);
		}
	});

	it("blockHeader - reward should be bigInt & min 0", ({ validator }) => {
		// Integer OK
		for (const reward of [0n, 1n, 2n]) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					reward,
				}).error,
			);
		}

		// NOT OK
		for (const reward of [0, 1, "0", "1", -1n, null, undefined]) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						reward,
					})
					.error!.includes("reward"),
			);
		}
	});

	it("blockHeader - payloadSize should be integer & min 0", ({ validator }) => {
		// Integer OK
		for (const payloadSize of [0, 1, 2]) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					payloadSize,
				}).error,
			);
		}

		// NOT OK
		for (const payloadSize of ["0", "1", 0.12, 1.234, -1, -0.23, null, undefined]) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						payloadSize,
					})
					.error!.includes("payloadSize"),
			);
		}
	});

	it("blockHeader - transactionsRoot should be hex", ({ validator }) => {
		const block = {
			...blockOriginal,
			transactionsRoot: "GHIJK",
		};

		assert.true(validator.validate("blockHeader", block).error!.includes("transactionsRoot"));
	});

	it("blockHeader - proposer should be address", ({ validator }) => {
		const validValues = ["0x" + "A".repeat(40), "0x" + "a".repeat(40), "0x" + "1".repeat(40)];
		for (const proposer of validValues) {
			assert.undefined(
				validator.validate("blockHeader", {
					...blockOriginal,
					proposer,
				}).error,
			);
		}

		const invalidValues = ["0x" + "G".repeat(40), "0x" + "A".repeat(39), "0x" + "A".repeat(41), "GHIJK"];
		for (const proposer of invalidValues) {
			assert.true(
				validator
					.validate("blockHeader", {
						...blockOriginal,
						proposer,
					})
					.error!.includes("proposer"),
			);
		}
	});

	it("block - transactions count should be equal transactionsCount", ({ validator }) => {
		validator.removeSchema("transactions");
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

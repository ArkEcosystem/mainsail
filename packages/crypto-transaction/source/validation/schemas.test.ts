import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { schemas as addressSchemas } from "@mainsail/crypto-address-keccak256";
import { schemas as base58addressSchemas } from "@mainsail/crypto-address-base58";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as keyPairSchemas } from "@mainsail/crypto-key-pair-ecdsa";
import { makeKeywords as makeBaseKeywords, schemas as baseSchemas } from "@mainsail/crypto-validation";
import { BigNumber } from "@mainsail/utils";
import { Validator } from "@mainsail/validation/source/validator";

import cryptoJson from "../../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { makeKeywords } from "./keywords";
import { schemas } from "./schemas";

describe<{
	app: Application;
	validator: Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	const transactionOriginal = {
		gasLimit: 21_000,
		gasPrice: 5 * 1e9,
		hash: "1".repeat(64),
		network: 10_000,
		nonce: 1,
		from: "0x" + "a".repeat(40),
		senderPublicKey: "a".repeat(66),
		value: 0,
	};

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		context.validator = context.app.resolve(Validator);

		for (const keyword of Object.values({
			...makeBaseKeywords(context.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
			...makeKeywords(context.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
			...baseSchemas,
			...keyPairSchemas,
			...addressSchemas,
			...base58addressSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("transactionHash - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("transactionHash", "0".repeat(64)).error);

		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("transactionHash", char.repeat(64)).error);
		}
	});

	it("transactionHash - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("transactionHash", "0".repeat(63)).error);
		assert.defined(validator.validate("transactionHash", "0".repeat(65)).error);
		assert.defined(validator.validate("transactionHash", 123).error);
		assert.defined(validator.validate("transactionHash", null).error);
		assert.defined(validator.validate("transactionHash").error);
		assert.defined(validator.validate("transactionHash", {}).error);

		const invalidChars = "ABCDEFGHIJKLghijkl!#$%&'|+/";
		for (const char of invalidChars) {
			assert.defined(validator.validate("transactionHash", char.repeat(64)).error);
		}
	});

	it("prefixedTransactionHash - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("prefixedTransactionHash", "0x" + "0".repeat(64)).error);

		const validChars = "0123456789abcdef";
		for (const char of validChars) {
			assert.undefined(validator.validate("prefixedTransactionHash", "0x" + char.repeat(64)).error);
		}
	});

	it("prefixedTransactionHash - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("prefixedTransactionHash", "0x" + "0".repeat(63)).error);
		assert.defined(validator.validate("prefixedTransactionHash", "0x" + "0".repeat(65)).error);
		assert.defined(validator.validate("prefixedTransactionHash", 123).error);
		assert.defined(validator.validate("prefixedTransactionHash", null).error);
		assert.defined(validator.validate("prefixedTransactionHash").error);
		assert.defined(validator.validate("prefixedTransactionHash", {}).error);

		const invalidChars = "ABCDEFGHIJKLghijkl!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("prefixedTransactionHash", "0x" + char.repeat(64)).error);
		}
	});

	it("networkByte - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("networkByte", 10000).error);
	});

	it("networkByte - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("networkByte", 123).error);
		assert.defined(validator.validate("networkByte", null).error);
		assert.defined(validator.validate("networkByte").error);
		assert.defined(validator.validate("networkByte", {}).error);
	});

	it("transactionBaseSchema - should be valid", ({ validator }) => {
		assert.undefined(validator.validate("transaction", transactionOriginal).error);
	});

	it("transactionBaseSchema - should allow additional properties", ({ validator }) => {
		const transaction = {
			...transactionOriginal,
			test: "test",
		};

		assert.undefined(validator.validate("transaction", transaction).error);
	});

	it("transactionBaseSchema - should have required fields", ({ validator }) => {
		const requiredFields = ["network", "value", "gasPrice", "nonce", "senderPublicKey"];
		for (const field of requiredFields) {
			const transaction = {
				...transactionOriginal,
			};

			delete transaction[field];

			assert.true(validator.validate("transaction", transaction).error.includes(field));
		}

		const optionalFields = ["hash", "v", "r", "s"];
		for (const field of optionalFields) {
			const transaction = {
				...transactionOriginal,
			};

			delete transaction[field];

			assert.undefined(validator.validate("transaction", transaction).error);
		}
	});

	it("transactionBaseSchema - value should be big number min 0", ({ validator }) => {
		const validValues = [0, "0", BigNumber.ZERO, "1", BigNumber.ONE, 100, "100", BigNumber.make(100)];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [-1, "-1", 1.1, BigNumber.make(-1), -1, null, undefined, {}, "test"];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("value"));
		}
	});

	it("transactionBaseSchema - gasPrice should be number min 5 gwei", ({ app, validator }) => {
		app.get<Configuration>(Identifiers.Cryptography.Configuration).setHeight(1);

		const validValues = [5, 10, 100];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				gasPrice: value * 1e9,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [0, -1, "-1", 1.1, BigNumber.make(-1), -1, null, undefined, {}, "test", 1 + 10000 * 1e9];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				gasPrice: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("gasPrice"));
		}
	});

	it("transactionBaseSchema - gasPrice should accept 0 for genesis block", ({ app, validator }) => {
		const configuration = app.get<Configuration>(Identifiers.Cryptography.Configuration);
		configuration.setHeight(1);

		const genesisBlock: Contracts.Crypto.BlockData = configuration.get("genesisBlock.block");

		const transaction = {
			...transactionOriginal,
			gasPrice: 0,
		};

		genesisBlock.transactions.push(transaction as unknown as Contracts.Crypto.TransactionData);

		assert.undefined(validator.validate("transaction", transaction).error);

		// Fails for non-genesis tx
		transaction.hash = "2".repeat(64);
		assert.true(validator.validate("transaction", transaction).error.includes("gasPrice"));

		// But works on height 0
		configuration.setHeight(0);
		assert.undefined(validator.validate("transaction", transaction).error);
	});

	it("transactionBaseSchema - hash should be transactionHash", ({ validator }) => {
		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			const transaction = {
				...transactionOriginal,
				hash: char.repeat(64),
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = ["0".repeat(63), "0".repeat(65), "G".repeat(64), "g".repeat(64), {}, "test"];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				hash: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("hash"));
		}
	});

	it("transactionBaseSchema - network should be valid networkByte", ({ validator }) => {
		const invalidValues = [20, {}, "test"];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				network: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("network"));
		}
	});

	it("transactionBaseSchema - nonce should be big number min 0", ({ validator }) => {
		const validValues = [0, "0", BigNumber.ZERO, 1, "1", BigNumber.ONE, 100, "100", BigNumber.make(100)];

		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				nonce: value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [-1, "-1", 1.1, BigNumber.make(-1), -1, null, undefined, {}, "test"];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				nonce: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("nonce"));
		}
	});

	it.skip("transactionBaseSchema - signature should be alphanumeric", ({ validator }) => {
		const validChars = "0123456789abcdefghijklmnopqrstuvwxyz";

		for (const char of validChars) {
			const transaction = {
				...transactionOriginal,
				signature: char.repeat(130),
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [..."ABCDEFGHJKLMNPQRSTUVWXYZ", "/", "!", "&", {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				signature: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("signature"));
		}
	});

	it.skip("transactionBaseSchema - signatures should be alphanumeric, 130 length, min 1 and max 16, unique items", ({
		validator,
	}) => {
		const validChars = "0123456789abcdefghijklmnopqrstuvwxyz";

		for (const char of validChars) {
			const transaction = {
				...transactionOriginal,
				signatures: [char.repeat(130)],
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [
			"a".repeat(129),
			"a".repeat(131),
			"A".repeat(130),
			"/".repeat(130),
			"!".repeat(130),
			"&".repeat(130),
			null,
			undefined,
			{},
		];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				signatures: [value],
			};

			assert.true(validator.validate("transaction", transaction).error.includes("signatures"));
		}

		// Len 0
		assert.true(
			validator
				.validate("transaction", {
					...transactionOriginal,
					signatures: [],
				})
				.error.includes("signatures"),
		);

		// Len > 16
		assert.true(
			validator
				.validate("transaction", {
					...transactionOriginal,
					signatures: [
						"a".repeat(130),
						"b".repeat(130),
						"c".repeat(130),
						"d".repeat(130),
						"e".repeat(130),
						"f".repeat(130),
						"g".repeat(130),
						"h".repeat(130),
						"i".repeat(130),
						"j".repeat(130),
						"k".repeat(130),
						"l".repeat(130),
						"m".repeat(130),
						"n".repeat(130),
						"o".repeat(130),
						"p".repeat(130),
						"r".repeat(130),
					],
				})
				.error.includes("signatures"),
		);

		// Unique
		assert.true(
			validator
				.validate("transaction", {
					...transactionOriginal,
					signatures: ["a".repeat(130), "a".repeat(130)],
				})
				.error.includes("signatures"),
		);
	});

	it.skip("signedSchema - should be ok with signature", ({ validator }) => {
		const transaction = {
			...transactionOriginal,
		};

		assert.undefined(validator.validate("transactionSigned", transaction).error);
	});

	it.skip("signedSchema - should be ok with signatures", ({ validator }) => {
		const transaction = {
			...transactionOriginal,
			signatures: ["a".repeat(130)],
		};

		delete transaction.signature;

		assert.undefined(validator.validate("transactionSigned", transaction).error);
	});

	it.skip("signedSchema - should be ok with signature & signatures", ({ validator }) => {
		const transaction = {
			...transactionOriginal,
			signatures: ["a".repeat(130)],
		};

		assert.undefined(validator.validate("transactionSigned", transaction).error);
	});

	it.skip("signedSchema - should not be ok without signature and signatures", ({ validator }) => {
		const transaction = {
			...transactionOriginal,
		};
		delete transaction.signature;

		assert.defined(validator.validate("transactionSigned", transaction).error);
	});

	it.skip("strictSchema - should not have any additional properties", ({ validator }) => {
		assert.undefined(
			validator.validate("transactionStrict", {
				...transactionOriginal,
			}).error,
		);

		assert.defined(
			validator.validate("transactionStrict", {
				...transactionOriginal,
				test: "test",
			}).error,
		);
	});

	it.skip("strictSchema - should not be ok without signature and signatures", ({ validator }) => {
		const transaction = {
			...transactionOriginal,
		};
		delete transaction.signature;

		assert.defined(validator.validate("transactionStrict", transaction).error);
	});
});

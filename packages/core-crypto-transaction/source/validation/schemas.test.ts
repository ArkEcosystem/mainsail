import { Identifiers } from "@arkecosystem/core-contracts";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { schemas as keyPairSchemas } from "@arkecosystem/core-crypto-key-pair-schnorr/distribution/schemas";
import { makeKeywords as makeBaseKeywords, schemas as baseSchemas } from "@arkecosystem/core-crypto-validation";
import { Validator } from "@arkecosystem/core-validation/source/validator";
import { BigNumber } from "@arkecosystem/utils";

import cryptoJson from "../../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../../core-test-framework/distribution";
import { makeKeywords } from "./keywords";
import { schemas, transactionBaseSchema } from "./schemas";
import { extendSchema, signedSchema, strictSchema } from "./utils";

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
			...makeBaseKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
			...makeKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
			...baseSchemas,
			...keyPairSchemas,
			...schemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	it("transactionId - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("transactionId", "0".repeat(64)).error);

		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			assert.undefined(validator.validate("transactionId", char.repeat(64)).error);
		}
	});

	it("transactionId - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("transactionId", "0".repeat(63)).error);
		assert.defined(validator.validate("transactionId", "0".repeat(65)).error);
		assert.defined(validator.validate("transactionId", 123).error);
		assert.defined(validator.validate("transactionId", null).error);
		assert.defined(validator.validate("transactionId").error);
		assert.defined(validator.validate("transactionId", {}).error);

		const invalidChars = "ABCDEFGHIJKLghijkl!#$%&'|+/";

		for (const char of invalidChars) {
			assert.defined(validator.validate("transactionId", char.repeat(64)).error);
		}
	});

	it("networkByte - should be ok", ({ validator }) => {
		assert.undefined(validator.validate("networkByte", 30).error);
	});

	it("networkByte - should not be ok", ({ validator }) => {
		assert.defined(validator.validate("networkByte", 123).error);
		assert.defined(validator.validate("networkByte", null).error);
		assert.defined(validator.validate("networkByte").error);
		assert.defined(validator.validate("networkByte", {}).error);
	});

	const schema = extendSchema(transactionBaseSchema, {
		$id: "transaction",
		properties: {
			type: { minimum: 0, type: "integer" },
		},
	});

	const transactionOriginal = {
		amount: 1,
		fee: 1,
		id: "1".repeat(64),
		network: 30,
		nonce: 0,
		senderPublicKey: "a".repeat(64),
		signature: "b".repeat(64),
		type: 1,
		typeGroup: 0,
		version: 1,
	};

	it("transactionBaseSchema - should be valid", ({ validator }) => {
		validator.addSchema(schema);

		assert.undefined(validator.validate("transaction", transactionOriginal).error);
	});

	it("transactionBaseSchema - should allow addtional properties", ({ validator }) => {
		validator.addSchema(schema);

		const transaction = {
			...transactionOriginal,
			test: "test",
		};

		assert.undefined(validator.validate("transaction", transaction).error);
	});

	it("transactionBaseSchema - should have required fields", ({ validator }) => {
		validator.addSchema(schema);

		const requiredFields = ["amount", "fee", "nonce", "senderPublicKey", "type"];
		for (const field of requiredFields) {
			const transaction = {
				...transactionOriginal,
			};

			delete transaction[field];

			assert.true(validator.validate("transaction", transaction).error.includes(field));
		}

		const optionalFields = ["id", "network", "signature", "typeGroup", "version"];
		for (const field of optionalFields) {
			const transaction = {
				...transactionOriginal,
			};

			delete transaction[field];

			assert.undefined(validator.validate("transaction", transaction).error);
		}
	});

	it("transactionBaseSchema - amount should be big number min 1", ({ validator }) => {
		validator.addSchema(schema);

		const validValues = [1, "1", BigNumber.ONE, 100, "100", BigNumber.make(100)];

		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [0, "0", 1.1, BigNumber.ZERO, -1, null, undefined, {}, "test"];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("amount"));
		}
	});

	it("transactionBaseSchema - fee should be big number min 0", ({ validator }) => {
		validator.addSchema(schema);

		const validValues = [0, "0", BigNumber.ZERO, 100, "100", BigNumber.make(100)];

		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [-1, "-1", 1.1, BigNumber.make(-1), -1, null, undefined, {}, "test"];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("fee"));
		}
	});

	it("transactionBaseSchema - id should be transactionId", ({ validator }) => {
		validator.addSchema(schema);

		const validChars = "0123456789abcdef";

		for (const char of validChars) {
			const transaction = {
				...transactionOriginal,
				id: char.repeat(64),
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = ["0".repeat(63), "0".repeat(65), "G".repeat(64), "g".repeat(64), {}, "test"];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				id: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("id"));
		}
	});

	it("transactionBaseSchema - network should be valid networkByte", ({ validator }) => {
		validator.addSchema(schema);

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
		validator.addSchema(schema);

		const validValues = [0, "0", BigNumber.ZERO, 100, "100", BigNumber.make(100)];

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

	it("transactionBaseSchema - signature should be alphanumeric", ({ validator }) => {
		validator.addSchema(schema);

		const validChars = "0123456789abcdefghijklmnopqrstuvwxyz";

		for (const char of validChars) {
			const transaction = {
				...transactionOriginal,
				signature: char,
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

	it("transactionBaseSchema - signatures should be alphanumeric, 130 length, min 1 and max 16, unique items", ({
		validator,
	}) => {
		validator.addSchema(schema);

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

	it("transactionBaseSchema - typeGroup should be integer min 0", ({ validator }) => {
		validator.addSchema(schema);

		const validValues = [0, 1, 100];

		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				typeGroup: value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [-1, "-1", 1.1, BigNumber.make(1), {}, "test"];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				typeGroup: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("typeGroup"));
		}
	});

	it("transactionBaseSchema - version should be 1", ({ validator }) => {
		validator.addSchema(schema);

		const validValues = [1];

		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				version: value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [-1, "1", 0, BigNumber.make(1), {}, "test"];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				version: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("version"));
		}
	});

	it("signedSchema - should be ok with signature", ({ validator }) => {
		validator.addSchema(signedSchema(schema));

		const transaction = {
			...transactionOriginal,
		};

		assert.undefined(validator.validate("transactionSigned", transaction).error);
	});

	it("signedSchema - should be ok with signatures", ({ validator }) => {
		validator.addSchema(signedSchema(schema));

		const transaction = {
			...transactionOriginal,
			signatures: ["a".repeat(130)],
		};

		delete transaction.signature;

		assert.undefined(validator.validate("transactionSigned", transaction).error);
	});

	it("signedSchema - should be ok with signature & signatures", ({ validator }) => {
		validator.addSchema(signedSchema(schema));

		const transaction = {
			...transactionOriginal,
			signatures: ["a".repeat(130)],
		};

		assert.undefined(validator.validate("transactionSigned", transaction).error);
	});

	it("signedSchema - should not be ok without signature and signatures", ({ validator }) => {
		validator.addSchema(signedSchema(schema));

		const transaction = {
			...transactionOriginal,
		};
		delete transaction.signature;

		assert.defined(validator.validate("transactionSigned", transaction).error);
	});

	it("strictSchema - should not have any additonal properties", ({ validator }) => {
		validator.addSchema(strictSchema(schema));

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

	it("strictSchema - should not be ok without signature and signatures", ({ validator }) => {
		validator.addSchema(signedSchema(schema));

		const transaction = {
			...transactionOriginal,
		};
		delete transaction.signature;

		assert.defined(validator.validate("transactionStrict", transaction).error);
	});
});

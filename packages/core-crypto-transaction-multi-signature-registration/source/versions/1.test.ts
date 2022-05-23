import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { schemas as addressSchemas } from "@arkecosystem/core-crypto-address-bech32m";
import { Configuration } from "@arkecosystem/core-crypto-config";
import { schemas as kayParSchemas } from "@arkecosystem/core-crypto-key-pair-schnorr";
import { makeFormats, makeKeywords, schemas as transactionSchemas } from "@arkecosystem/core-crypto-transaction";
import { ServiceProvider as CryptoValidationServiceProvider } from "@arkecosystem/core-crypto-validation";
import { ServiceProvider as ValidationServiceProvider } from "@arkecosystem/core-validation";
import { BigNumber } from "@arkecosystem/utils";

import cryptoJson from "../../../core/bin/config/testnet/crypto.json";
import { describe, Sandbox } from "../../../core-test-framework";
import { MultiSignatureRegistrationTransaction } from "./1";

describe<{
	sandbox: Sandbox;
	validator: Contracts.Crypto.IValidator;
}>("Schemas", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		await context.sandbox.app.resolve(ValidationServiceProvider).register();
		await context.sandbox.app.resolve(CryptoValidationServiceProvider).register();

		context.validator = context.sandbox.app.get<Contracts.Crypto.IValidator>(Identifiers.Cryptography.Validator);

		for (const [name, format] of Object.entries({
			...makeFormats(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addFormat(name, format);
		}

		for (const keyword of Object.values({
			...makeKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
			...transactionSchemas,
			...kayParSchemas,
			...addressSchemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	const transactionOriginal = {
		amount: 0,
		asset: {
			multiSignature: {
				min: 1,
				publicKeys: ["a".repeat(64), "b".repeat(64)],
			},
		},
		fee: 1,
		nonce: 0,
		recipientId: "a".repeat(62),
		senderPublicKey: "a".repeat(64),
		signatures: ["a".repeat(130), "b".repeat(130)],
		type: Contracts.Crypto.TransactionType.MultiSignature,
	};

	it("#getSchema - should be valid", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		assert.undefined(validator.validate("multiSignature", transactionOriginal).error);
	});

	it("#getSchema - amount should be bigNumber, equal 0", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const validValues = [0, "0", BigNumber.ZERO];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.undefined(validator.validate("multiSignature", transaction).error);
		}

		const invalidValues = [-1, 1.1, 1, BigNumber.ONE, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.true(validator.validate("multiSignature", transaction).error.includes("amount"));
		}
	});

	it("#getSchema - asset should be required object", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const invalidValues = [1, BigNumber.ONE, "test", null, undefined, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: value,
			};

			assert.defined(validator.validate("multiSignature", transaction).error);
		}
	});

	it("#getSchema - asset should not contain unevaluated properties", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const transaction = {
			...transactionOriginal,
			asset: {
				multiSignature: {
					min: 1,
					publicKeys: ["a".repeat(64), "b".repeat(64)],
				},
				test: "test",
			},
		};

		assert.true(validator.validate("multiSignature", transaction).error.includes("unevaluated properties"));
	});

	it("#getSchema - asset.multiSignature should not contain unevaluated properties", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const transaction = {
			...transactionOriginal,
			asset: {
				multiSignature: {
					min: 1,
					publicKeys: ["a".repeat(64), "b".repeat(64)],
					test: "test",
				},
			},
		};

		assert.true(validator.validate("multiSignature", transaction).error.includes("unevaluated properties"));
	});

	it("#getSchema - asset.multiSignature should be required object", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const invalidValues = [1, BigNumber.ONE, "test", null, undefined, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: {
					multiSignature: value,
				},
			};

			assert.defined(validator.validate("multiSignature", transaction).error);
		}
	});

	it("#getSchema - asset.multiSignature.min should be integer, min 1, max = publicKeys.lenght", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const validValues = [1, 2];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				asset: {
					multiSignature: {
						min: value,
						publicKeys: ["a".repeat(64), "b".repeat(64)],
					},
				},
			};

			assert.undefined(validator.validate("multiSignature", transaction).error);
		}

		const invalidValues = [0, -1, 1.1, 3, BigNumber.ONE, "test", null, undefined, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: {
					multiSignature: {
						min: value,
						publicKeys: ["a".repeat(64), "b".repeat(64)],
					},
				},
			};

			assert.defined(validator.validate("multiSignature", transaction).error);
		}
	});

	it("#getSchema - asset.multiSignature.publicKeys should be array, min 1, max 16", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const invalidValues = [0, -1, 1.1, 3, BigNumber.ONE, "test", null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: {
					multiSignature: {
						min: 2,
						publicKeys: value,
					},
				},
			};

			assert.defined(validator.validate("multiSignature", transaction).error);
		}

		// Min 1
		assert.defined(
			validator.validate("multiSignature", {
				...transactionOriginal,
				asset: {
					multiSignature: {
						min: 1,
						publicKeys: [],
					},
				},
			}).error,
		);

		// Max 16
		assert.true(
			validator
				.validate("multiSignature", {
					...transactionOriginal,
					asset: {
						multiSignature: {
							min: 1,
							publicKeys: [
								"0".repeat(64),
								"1".repeat(64),
								"2".repeat(64),
								"3".repeat(64),
								"4".repeat(64),
								"5".repeat(64),
								"6".repeat(64),
								"7".repeat(64),
								"8".repeat(64),
								"9".repeat(64),
								"A".repeat(64),
								"B".repeat(64),
								"C".repeat(64),
								"D".repeat(64),
								"E".repeat(64),
								"F".repeat(64),
								"FE".repeat(32),
							],
						},
					},
				})
				.error.includes("publicKeys"),
		);

		// Unique
		assert.true(
			validator
				.validate("multiSignature", {
					...transactionOriginal,
					asset: {
						multiSignature: {
							min: 1,
							publicKeys: ["0".repeat(64), "0".repeat(64)],
						},
					},
				})
				.error.includes("publicKeys"),
		);
	});

	it("#getSchema - signatures should be lenght 130, min = multiSignature.min, max = publicKeys", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const invalidValues = [
			["a".repeat(129)],
			["a".repeat(131)],
			["%".repeat(130)],
			-1,
			1.1,
			0,
			BigNumber.ZERO,
			"test",
			null,
			undefined,
			{},
		];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				signatures: value,
			};

			assert.true(validator.validate("multiSignature", transaction).error.includes("signatures"));
		}
	});

	it("#getSchema - fee should be bigNumber, min 1", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const validValues = [1, 100, BigNumber.ONE];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.undefined(validator.validate("multiSignature", transaction).error);
		}

		const invalidValues = [-1, 1.1, 0, BigNumber.ZERO, "test", null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.true(validator.validate("multiSignature", transaction).error.includes("fee"));
		}
	});

	it("#getSchema - type should be transfer", ({ validator }) => {
		validator.addSchema(MultiSignatureRegistrationTransaction.getSchema());

		const validValues = [Contracts.Crypto.TransactionType.MultiSignature];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				type: value,
			};

			assert.undefined(validator.validate("multiSignature", transaction).error);
		}

		const invalidValues = [
			-1,
			1.1,
			Contracts.Crypto.TransactionType.Vote,
			BigNumber.ZERO,
			"test",
			null,
			undefined,
			{},
		];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				type: value,
			};

			assert.true(validator.validate("multiSignature", transaction).error.includes("type"));
		}
	});
});

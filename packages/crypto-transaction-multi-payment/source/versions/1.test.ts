import { Contracts, Identifiers } from "@mainsail/contracts";
import { schemas as addressSchemas } from "@mainsail/crypto-address-bech32m";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as kayParSchemas } from "@mainsail/crypto-key-pair-schnorr";
import {
	makeFormats,
	makeKeywords as makeTransactionKeywords,
	schemas as transactionSchemas,
} from "@mainsail/crypto-transaction";
import { ServiceProvider as CryptoValidationServiceProvider } from "@mainsail/crypto-validation";
import { BigNumber } from "@mainsail/utils";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import cryptoJson from "../../../core/bin/config/testnet/core/crypto.json";
import { describe, Sandbox } from "../../../test-framework/source";
import { makeKeywords } from "../validation";
import { MultiPaymentTransaction } from "./1";

describe<{
	sandbox: Sandbox;
	validator: Contracts.Crypto.Validator;
}>("Schemas", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		await context.sandbox.app.resolve(ValidationServiceProvider).register();
		await context.sandbox.app.resolve(CryptoValidationServiceProvider).register();

		context.validator = context.sandbox.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		for (const [name, format] of Object.entries({
			...makeFormats(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addFormat(name, format);
		}

		for (const keyword of Object.values({
			...makeTransactionKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
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
		amount: 1,
		asset: {
			payments: [
				{
					amount: BigNumber.ONE,
					recipientId: "a".repeat(62),
				},
				{
					amount: BigNumber.ONE,
					recipientId: "b".repeat(62),
				},
			],
		},
		fee: 1,
		nonce: 1,
		senderPublicKey: "a".repeat(64),
		type: Contracts.Crypto.TransactionType.MultiPayment,
	};

	it("#getSchema - should be valid", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		assert.undefined(validator.validate("multiPayment", transactionOriginal).error);
	});

	it("#getSchema - amount should be bigNumber, bigger equal 1", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		const validValues = [1, "1", BigNumber.ONE, "2"];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.undefined(validator.validate("multiPayment", transaction).error);
		}

		const invalidValues = [-1, 1.1, 0, BigNumber.ZERO, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.true(validator.validate("multiPayment", transaction).error.includes("amount"));
		}
	});

	it("#getSchema - asset should be required object", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		const invalidValues = [1, BigNumber.ONE, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: value,
			};

			assert.true(validator.validate("multiPayment", transaction).error.includes("asset"));
		}
	});

	it("#getSchema - asset should not contain unevaluatedProperties", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		const transaction = {
			...transactionOriginal,
			asset: {
				payments: [
					{
						amount: BigNumber.ONE,
						recipientId: "a".repeat(62),
					},
					{
						amount: BigNumber.ONE,
						recipientId: "b".repeat(62),
					},
				],
				test: "test",
			},
		};

		assert.true(validator.validate("multiPayment", transaction).error.includes("unevaluated properties"));
	});

	it("#getSchema - payments should not contain unevaluatedProperties", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		const transaction = {
			...transactionOriginal,
			asset: {
				payments: [
					{
						amount: BigNumber.ONE,
						recipientId: "a".repeat(62),
						test: "test",
					},
					{
						amount: BigNumber.ONE,
						recipientId: "b".repeat(62),
					},
				],
			},
		};

		assert.true(validator.validate("multiPayment", transaction).error.includes("unevaluated properties"));
	});

	it("#getSchema - asset.payments should be min 2, max = multiPaymentLimit, non-unique", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		assert.undefined(
			validator.validate("multiPayment", {
				...transactionOriginal,
				asset: {
					payments: [
						{
							amount: BigNumber.ONE,
							recipientId: "a".repeat(62),
						},
						{
							amount: BigNumber.ONE,
							recipientId: "a".repeat(62),
						},
					],
				},
			}).error,
		);

		const invalidValues = [1, BigNumber.ONE, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: {
					payments: value,
				},
			};

			assert.true(validator.validate("multiPayment", transaction).error.includes("payments"));
		}

		// Min 2
		assert.true(
			validator
				.validate("multiPayment", {
					...transactionOriginal,
					asset: {
						payments: [
							{
								amount: BigNumber.ONE,
								recipientId: "a".repeat(62),
							},
						],
					},
				})
				.error.includes("payments"),
		);

		// Max 256
		assert.true(
			validator
				.validate("multiPayment", {
					...transactionOriginal,
					asset: {
						payments: Array.from({ length: 257 }).fill({
							amount: BigNumber.ONE,
							recipientId: "a".repeat(62),
						}),
					},
				})
				.error.includes("payments"),
		);
	});

	it("#getSchema - asset.payments.amount should be bigNumber, >= 1", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		const validValues = [1, "1", BigNumber.ONE, 100, "100", BigNumber.make(100)];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				asset: {
					payments: [
						{
							amount: value,
							recipientId: "a".repeat(62),
						},
						{
							amount: value,
							recipientId: "a".repeat(62),
						},
					],
				},
			};

			assert.undefined(validator.validate("multiPayment", transaction).error);
		}

		const invalidValues = [-1, 1.1, 0, BigNumber.ZERO, "test", null, undefined, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: {
					payments: [
						{
							amount: value,
							recipientId: "a".repeat(62),
						},
						{
							amount: value,
							recipientId: "a".repeat(62),
						},
					],
				},
			};

			assert.true(validator.validate("multiPayment", transaction).error.includes("amount"));
		}
	});

	it("#getSchema - asset.payments.recipientId should be adddress", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		const invalidValues = ["a".repeat(61), "a".repeat(63), -1, 1.1, 0, BigNumber.ZERO, "test", null, undefined, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: {
					payments: [
						{
							amount: 1,
							recipientId: value,
						},
						{
							amount: 1,
							recipientId: value,
						},
					],
				},
			};

			assert.true(validator.validate("multiPayment", transaction).error.includes("recipientId"));
		}
	});

	it("#getSchema - fee should be bigNumber, min 0", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		const validValues = [0, 1, 100, BigNumber.ZERO, BigNumber.ONE];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.undefined(validator.validate("multiPayment", transaction).error);
		}

		const invalidValues = [-1, 1.1, "test", null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.true(validator.validate("multiPayment", transaction).error.includes("fee"));
		}
	});

	it("#getSchema - type should be multiPayment", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		const validValues = [Contracts.Crypto.TransactionType.MultiPayment];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				type: value,
			};

			assert.undefined(validator.validate("multiPayment", transaction).error);
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

			assert.true(validator.validate("multiPayment", transaction).error.includes("type"));
		}
	});

	it("#getSchema - vendorField should be vendorField or null", ({ validator }) => {
		validator.addSchema(MultiPaymentTransaction.getSchema());

		const validValues = ["", "dummy", "a".repeat(255), null, undefined];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				vendorField: value,
			};

			assert.undefined(validator.validate("multiPayment", transaction).error);
		}

		const invalidValues = [-1, 1.1, 0, BigNumber.ZERO, "a".repeat(256), {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				vendorField: value,
			};

			assert.true(validator.validate("multiPayment", transaction).error.includes("vendorField"));
		}
	});
});

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
import { TransferTransaction } from "./1";

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
		amount: 1,
		fee: 1,
		nonce: 0,
		recipientId: "a".repeat(62),
		senderPublicKey: "a".repeat(64),
		type: 0,
	};

	it("#getSchema - should be valid", ({ validator }) => {
		validator.addSchema(TransferTransaction.getSchema());

		assert.undefined(validator.validate("transfer", transactionOriginal).error);
	});

	it("#getSchema - expiration should be integer, min 0", ({ validator }) => {
		validator.addSchema(TransferTransaction.getSchema());

		const validValues = [0, 1, 100, undefined];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				expiration: value,
			};

			assert.undefined(validator.validate("transfer", transaction).error);
		}

		const invalidValues = [-1, 1.1, BigNumber.ONE, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				expiration: value,
			};

			assert.true(validator.validate("transfer", transaction).error.includes("expiration"));
		}
	});

	it("#getSchema - fee should be bigNumber, min 1", ({ validator }) => {
		validator.addSchema(TransferTransaction.getSchema());

		const validValues = [1, 100, BigNumber.ONE];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.undefined(validator.validate("transfer", transaction).error);
		}

		const invalidValues = [-1, 1.1, 0, BigNumber.ZERO, "test", null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.true(validator.validate("transfer", transaction).error.includes("fee"));
		}
	});

	it("#getSchema - recipientId should be address", ({ validator }) => {
		validator.addSchema(TransferTransaction.getSchema());

		const validChars = "0123456789abcdefghijklmnopqrstuvwxyz";
		for (const char of validChars) {
			const transaction = {
				...transactionOriginal,
				recipientId: char.repeat(62),
			};

			assert.undefined(validator.validate("transfer", transaction).error);
		}

		const invalidValues = ["a".repeat(61), "a".repeat(63), "A".repeat(62), "&".repeat(62), null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				recipientId: value,
			};

			assert.true(validator.validate("transfer", transaction).error.includes("recipientId"));
		}
	});

	it("#getSchema - type should be transfer", ({ validator }) => {
		validator.addSchema(TransferTransaction.getSchema());

		const validValues = [Contracts.Crypto.TransactionType.Transfer];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				type: value,
			};

			assert.undefined(validator.validate("transfer", transaction).error);
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

			assert.true(validator.validate("transfer", transaction).error.includes("type"));
		}
	});

	it("#getSchema - vendorField should be vendorField or null", ({ validator }) => {
		validator.addSchema(TransferTransaction.getSchema());

		const validValues = ["", "dummy", "a".repeat(255), null, undefined];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				vendorField: value,
			};

			assert.undefined(validator.validate("transfer", transaction).error);
		}

		const invalidValues = [-1, 1.1, 0, BigNumber.ZERO, "a".repeat(256), {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				vendorField: value,
			};

			assert.true(validator.validate("transfer", transaction).error.includes("vendorField"));
		}
	});
});

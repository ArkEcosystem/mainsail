import { Contracts, Identifiers } from "@mainsail/contracts";
import { schemas as addressSchemas } from "@mainsail/crypto-address-bech32m";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as kayParSchemas } from "@mainsail/crypto-key-pair-schnorr";
import { makeFormats, makeKeywords, schemas as transactionSchemas } from "@mainsail/crypto-transaction";
import { ServiceProvider as CryptoValidationServiceProvider } from "@mainsail/crypto-validation";
import { BigNumber } from "@mainsail/utils";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";

import cryptoJson from "../../../core/bin/config/testnet/mainsail/crypto.json";
import { ServiceProvider as CryptoConsensusServiceProvider } from "../../../crypto-consensus-bls12-381";
import { describe, Sandbox } from "../../../test-framework";
import { ValidatorRegistrationTransaction } from "./1";

describe<{
	sandbox: Sandbox;
	validator: Contracts.Crypto.Validator;
}>("Schemas", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);
		context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(cryptoJson);

		await context.sandbox.app.resolve(ValidationServiceProvider).register();
		await context.sandbox.app.resolve(CryptoValidationServiceProvider).register();
		await context.sandbox.app.resolve(CryptoConsensusServiceProvider).register();

		context.validator = context.sandbox.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

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
			validatorPublicKey: "a".repeat(96),
		},
		fee: 1,
		nonce: 1,
		senderPublicKey: "a".repeat(64),
		type: Contracts.Crypto.TransactionType.ValidatorRegistration,
	};

	it("#getSchema - should be valid", ({ validator }) => {
		validator.addSchema(ValidatorRegistrationTransaction.getSchema());

		assert.undefined(validator.validate("validatorRegistration", transactionOriginal).error);
	});

	it("#getSchema - amount should be bigNumber, equal 0", ({ validator }) => {
		validator.addSchema(ValidatorRegistrationTransaction.getSchema());

		const validValues = [0, "0", BigNumber.ZERO];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.undefined(validator.validate("validatorRegistration", transaction).error);
		}

		const invalidValues = [-1, 1.1, 1, BigNumber.ONE, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.true(validator.validate("validatorRegistration", transaction).error.includes("amount"));
		}
	});

	it("#getSchema - asset should be required object", ({ validator }) => {
		validator.addSchema(ValidatorRegistrationTransaction.getSchema());

		const invalidValues = [1, BigNumber.ONE, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: value,
			};

			assert.true(validator.validate("validatorRegistration", transaction).error.includes("asset"));
		}
	});

	it("#getSchema - asset should not contain unevaluated properties", ({ validator }) => {
		validator.addSchema(ValidatorRegistrationTransaction.getSchema());

		const transaction = {
			...transactionOriginal,
			asset: {
				test: "test",
				validatorPublicKey: "a".repeat(96),
			},
		};

		assert.true(validator.validate("validatorRegistration", transaction).error.includes("unevaluated properties"));
	});

	it("#getSchema - publicKey should be consensusPublicKey", ({ validator }) => {
		validator.addSchema(ValidatorRegistrationTransaction.getSchema());

		const invalidValues = [1, BigNumber.ONE, "", "a".repeat(21), null, undefined, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				asset: {
					validatorPublicKey: value,
				},
			};

			assert.true(validator.validate("validatorRegistration", transaction).error.includes("validatorPublicKey"));
		}
	});

	it("#getSchema - fee should be bigNumber, min 0", ({ validator }) => {
		validator.addSchema(ValidatorRegistrationTransaction.getSchema());

		const validValues = [0, 1, 100, BigNumber.ZERO, BigNumber.ONE];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.undefined(validator.validate("validatorRegistration", transaction).error);
		}

		const invalidValues = [-1, 1.1, "test", null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.true(validator.validate("validatorRegistration", transaction).error.includes("fee"));
		}
	});

	it("#getSchema - type should be validatorRegistration", ({ validator }) => {
		validator.addSchema(ValidatorRegistrationTransaction.getSchema());

		const validValues = [Contracts.Crypto.TransactionType.ValidatorRegistration];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				type: value,
			};

			assert.undefined(validator.validate("validatorRegistration", transaction).error);
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

			assert.true(validator.validate("validatorRegistration", transaction).error.includes("type"));
		}
	});
});

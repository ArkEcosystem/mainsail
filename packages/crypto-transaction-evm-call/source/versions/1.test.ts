import { Contracts, Identifiers } from "@mainsail/contracts";
import { schemas as addressSchemas } from "@mainsail/crypto-address-keccak256";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as kayParSchemas } from "@mainsail/crypto-key-pair-ecdsa";
import { makeFormats, makeKeywords, schemas as transactionSchemas } from "@mainsail/crypto-transaction";
import { ServiceProvider as CryptoValidationServiceProvider } from "@mainsail/crypto-validation";
import { BigNumber } from "@mainsail/utils";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ethers } from "ethers";

import cryptoJson from "../../../core/bin/config/testnet/core/crypto.json";
import { describe, Sandbox } from "../../../test-framework/source";
import { EvmCallTransaction } from "./1";

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
			evmCall: {
				gasLimit: 21_000,
				payload: "00",
			},
		},
		fee: 1,
		nonce: 1,
		recipientId: ethers.ZeroAddress,
		senderPublicKey: "a".repeat(66),
		type: Contracts.Crypto.TransactionType.EvmCall,
	};

	it("#getSchema - should be valid", ({ validator }) => {
		validator.addSchema(EvmCallTransaction.getSchema());

		assert.undefined(validator.validate("evmCall", transactionOriginal).error);
	});

	it("#getSchema - amount should be bigNumber, equal 0", ({ validator }) => {
		validator.addSchema(EvmCallTransaction.getSchema());

		const validValues = [0, "0", BigNumber.ZERO];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.undefined(validator.validate("evmCall", transaction).error);
		}

		const invalidValues = [-1, 1.1, 1, BigNumber.ONE, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				amount: value,
			};

			assert.true(validator.validate("evmCall", transaction).error.includes("amount"));
		}
	});

	it("#getSchema - fee should be bigNumber, min 0", ({ validator }) => {
		validator.addSchema(EvmCallTransaction.getSchema());

		const validValues = [0, 1, 100, BigNumber.ZERO, BigNumber.ONE];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.undefined(validator.validate("evmCall", transaction).error);
		}

		const invalidValues = [-1, 1.1, "test", null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				fee: value,
			};

			assert.true(validator.validate("evmCall", transaction).error.includes("fee"));
		}
	});

	it("#getSchema - type should be evmCall", ({ validator }) => {
		validator.addSchema(EvmCallTransaction.getSchema());

		const validValues = [Contracts.Crypto.TransactionType.EvmCall];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				type: value,
			};

			assert.undefined(validator.validate("evmCall", transaction).error);
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

			assert.true(validator.validate("evmCall", transaction).error.includes("type"));
		}
	});
});

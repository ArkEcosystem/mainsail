import { Contracts, Identifiers } from "@mainsail/contracts";
import { schemas as addressSchemas } from "@mainsail/crypto-address-keccak256";
import { schemas as base58AddressSchemas } from "@mainsail/crypto-address-base58";
import { Configuration } from "@mainsail/crypto-config";
import { schemas as kayParSchemas } from "@mainsail/crypto-key-pair-ecdsa";
import { makeKeywords, schemas as transactionSchemas } from "@mainsail/crypto-transaction";
import { ServiceProvider as CryptoValidationServiceProvider } from "@mainsail/crypto-validation";
import { BigNumber } from "@mainsail/utils";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ethers } from "ethers";

import cryptoJson from "../../../core/bin/config/devnet/core/crypto.json";
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

		for (const keyword of Object.values({
			...makeKeywords(context.sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
			...transactionSchemas,
			...kayParSchemas,
			...addressSchemas,
			...base58AddressSchemas,
		})) {
			context.validator.addSchema(schema);
		}
	});

	const transactionOriginal = {
		value: 0,
		gasPrice: 5 * 1e9,
		gasLimit: 21000,
		nonce: 1,
		to: ethers.ZeroAddress,
		senderPublicKey: "a".repeat(66),
		from: "0x" + "a".repeat(40),
		type: 0,
	};

	it("#getSchema - should be valid", ({ validator }) => {
		validator.addSchema(EvmCallTransaction.getSchema());

		assert.undefined(validator.validate("evmCall", transactionOriginal).error);
	});

	it("#getSchema - value should be bigNumber", ({ validator }) => {
		validator.addSchema(EvmCallTransaction.getSchema());

		const validValues = [0, "0", BigNumber.ZERO, 1, "1", BigNumber.ONE];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				value,
			};

			assert.undefined(validator.validate("evmCall", transaction).error);
		}

		const invalidValues = [-1, 1.1, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				value,
			};

			assert.true(validator.validate("evmCall", transaction).error.includes("value"));
		}
	});

	it("#getSchema - gasPrice should be integer, min 5, max 1000 gwei", ({ sandbox, validator }) => {
		validator.addSchema(EvmCallTransaction.getSchema());

		const configuration = sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);
		configuration.setHeight(1);

		const validValues = [5, 6, 1000];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				gasPrice: value * 1e9,
			};

			assert.undefined(validator.validate("evmCall", transaction).error);
		}

		const invalidValues = [0, -1, 1.1, "test", null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				gasPrice: value,
			};

			assert.true(validator.validate("evmCall", transaction).error.includes("gasPrice"));
		}
	});

	it("#getSchema - recipient should be optional", ({ validator }) => {
		validator.addSchema(EvmCallTransaction.getSchema());

		const transaction = {
			...transactionOriginal,
			recipientAddress: undefined,
		};

		assert.undefined(validator.validate("evmCall", transaction).error);
	});
});

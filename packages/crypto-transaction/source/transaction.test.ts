import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Configuration } from "@mainsail/crypto-config";
import { BigNumber } from "@mainsail/utils";
import { zeroAddress } from "viem";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
	factory: Contracts.Crypto.TransactionFactory;
	serializer: Contracts.Crypto.TransactionSerializer;
	deserializer: Contracts.Crypto.TransactionDeserializer;
}>("Schemas", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);
		context.factory = context.app.get<Contracts.Crypto.TransactionFactory>(
			Identifiers.Cryptography.Transaction.Factory,
		);
		context.serializer = context.app.get<Contracts.Crypto.TransactionSerializer>(
			Identifiers.Cryptography.Transaction.Serializer,
		);
		context.deserializer = context.app.get<Contracts.Crypto.TransactionDeserializer>(
			Identifiers.Cryptography.Transaction.Deserializer,
		);
	});

	const transactionOriginal = {
		value: 0,
		gasPrice: 5 * 1e9,
		gasLimit: 21000,
		nonce: 1,
		network: 10000,
		to: zeroAddress,
		senderPublicKey: "a".repeat(66),
		from: "0x" + "a".repeat(40),
		type: 0,
	};

	it("#getSchema - should be valid", ({ validator }) => {
		assert.undefined(validator.validate("transaction", transactionOriginal).error);
	});

	it("#getSchema - value should be bigNumber", ({ validator }) => {
		const validValues = [0, "0", BigNumber.ZERO, 1, "1", BigNumber.ONE];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [-1, 1.1, "test", null, {}];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("value"));
		}
	});

	it("#getSchema - gasPrice should be integer, min 5, max 1000 gwei", ({ app, validator }) => {
		const configuration = app.get<Configuration>(Identifiers.Cryptography.Configuration);
		configuration.setHeight(1);

		const validValues = [5, 6, 1000];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				gasPrice: value * 1e9,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [0, -1, 1.1, "test", null, undefined, {}];
		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				gasPrice: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("gasPrice"));
		}
	});

	it("#getSchema - recipient should be optional", ({ validator }) => {
		const transaction = {
			...transactionOriginal,
			recipientAddress: undefined,
		};

		assert.undefined(validator.validate("transaction", transaction).error);
	});
});

import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { schemas as addressSchemas } from "@mainsail/crypto-address-keccak256";
import { schemas as base58addressSchemas } from "@mainsail/crypto-address-base58";
import { schemas as keyPairSchemas } from "@mainsail/crypto-key-pair-ecdsa";
import { makeKeywords as makeBaseKeywords } from "@mainsail/crypto-validation";
import { BigNumber } from "@mainsail/utils";
import { ServiceProvider as ValidationServiceProvider } from "@mainsail/validation";
import { ServiceProvider as CryptoConfigServiceProvider } from "@mainsail/crypto-config";

import cryptoJson from "../../../core/bin/config/devnet/core/crypto.json";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { makeKeywords } from "./keywords";
import { schemas } from "./schemas";

describe<{
	app: Application;
	validator: Contracts.Crypto.Validator;
}>("Schemas", ({ it, assert, beforeEach }) => {
	const transactionOriginal = {
		gasLimit: 21_000,
		gasPrice: 5 * 1e9,
		network: 10_000,
		nonce: BigNumber.ONE,
		data: "0x",
		value: BigNumber.ZERO,
	};

	const transactionSigned = {
		...transactionOriginal,
		hash: "0".repeat(64),
		from: "0x" + "a".repeat(40),
		senderPublicKey: "a".repeat(66),
		senderLegacyAddress: "a".repeat(33),
		v: 0,
		r: "1".repeat(64),
		s: "2".repeat(64),
	};

	beforeEach(async (context) => {
		context.app = new Application();
		context.app.get<Contracts.Kernel.Repository>(Identifiers.Config.Repository).set("crypto", cryptoJson);
		await context.app.resolve(ValidationServiceProvider).register();
		await context.app.resolve(CryptoConfigServiceProvider).register();
		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);


		context.validator = context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator);

		for (const keyword of Object.values({
			...makeBaseKeywords(context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)),
			...makeKeywords(context.app.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)),
		})) {
			context.validator.addKeyword(keyword);
		}

		for (const schema of Object.values({
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
		assert.defined(validator.validate("networkByte", undefined).error);
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
		const requiredFields = ["network", "value", "gasPrice", "nonce", "data"];
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
		const validValues = [BigNumber.ZERO, BigNumber.ONE, BigNumber.make(100)];
		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [
			0,
			"0",
			"1",
			-1,
			"-1",
			1.1,
			100,
			"100",
			BigNumber.make(-1),
			-1,
			null,
			undefined,
			{},
			"test",
		];

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
			hash: "1".repeat(64),
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
		const validValues = [BigNumber.ZERO, BigNumber.ONE, BigNumber.make(100)];

		for (const value of validValues) {
			const transaction = {
				...transactionOriginal,
				nonce: value,
			};

			assert.undefined(validator.validate("transaction", transaction).error);
		}

		const invalidValues = [
			0,
			"0",
			"1",
			-1,
			"-1",
			1.1,
			100,
			"100",
			BigNumber.make(-1),
			-1,
			null,
			undefined,
			{},
			"test",
		];

		for (const value of invalidValues) {
			const transaction = {
				...transactionOriginal,
				nonce: value,
			};

			assert.true(validator.validate("transaction", transaction).error.includes("nonce"));
		}
	});

	it("signedSchema - should be ok", ({ validator }) => {
		const transaction = {
			...transactionSigned,
		};

		assert.undefined(validator.validate("transactionSigned", transaction).error);
	});

	it("signedSchema - should not be ok if v,r,s or hash are missing", ({ validator }) => {
		const transaction = {
			...transactionSigned,
		};

		const props = ["v", "r", "s"] as const;
		for (const prop of props) {
			const transactionCopy = {
				...transaction,
			};

			delete transactionCopy[prop];

			assert.true(validator.validate("transactionSigned", transactionCopy).error.includes(prop));
		}
	});

	it("signedSchema - should be ok for v value", ({ validator }) => {
		const validValues = [0, 1];

		for (const v of validValues) {
			const transaction = {
				...transactionSigned,
				v,
			};

			assert.undefined(validator.validate("transactionSigned", transaction).error);
		}

		const invalidValues = [-1, 2, "0", null, undefined, {}, "test"];
		for (const v of invalidValues) {
			const transaction = {
				...transactionSigned,
				v,
			};

			assert.true(validator.validate("transactionSigned", transaction).error.includes("v"));
		}
	});

	it("signedSchema - should be ok for r value", ({ validator }) => {
		const validValues = "0123456789abcdef".split("").map((char) => char.repeat(64));

		for (const r of validValues) {
			const transaction = {
				...transactionSigned,
				r,
			};

			assert.undefined(validator.validate("transactionSigned", transaction).error);
		}

		const invalidValues = [
			-1,
			2,
			"0",
			null,
			undefined,
			{},
			"test",
			"0".repeat(63),
			"0".repeat(65),
			"A".repeat(64),
			"g".repeat(64),
		];
		for (const r of invalidValues) {
			const transaction = {
				...transactionSigned,
				r,
			};

			assert.true(validator.validate("transactionSigned", transaction).error.includes("r"));
		}
	});

	it("signedSchema - should be ok for s value", ({ validator }) => {
		const validValues = "0123456789abcdef".split("").map((char) => char.repeat(64));

		for (const s of validValues) {
			const transaction = {
				...transactionSigned,
				s,
			};

			assert.undefined(validator.validate("transactionSigned", transaction).error);
		}

		const invalidValues = [
			-1,
			2,
			"0",
			null,
			undefined,
			{},
			"test",
			"0".repeat(63),
			"0".repeat(65),
			"A".repeat(64),
			"g".repeat(64),
		];
		for (const s of invalidValues) {
			const transaction = {
				...transactionSigned,
				s,
			};

			assert.true(validator.validate("transactionSigned", transaction).error.includes("s"));
		}
	});

	it("strictSchema - should be ok", ({ validator }) => {
		const transaction = {
			...transactionSigned,
		};

		assert.undefined(validator.validate("transactionStrict", transaction).error);
	});

	it("strictSchema - should not be ok with any missing property", ({ validator }) => {
		const props = Object.keys(transactionSigned);
		for (const prop of props) {
			const transaction = {
				...transactionSigned,
				[prop]: undefined,
			};

			assert.true(validator.validate("transactionStrict", transaction).error.includes(prop));
		}
	});

	it("strictSchema - should not be ok with any additional property", ({ validator }) => {
		const transaction = {
			...transactionSigned,
			test: "test",
		};

		assert.defined(validator.validate("transactionStrict", transaction).error);
	});
});

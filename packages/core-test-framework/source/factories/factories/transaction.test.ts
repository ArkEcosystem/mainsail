import { Contracts } from "@arkecosystem/core-contracts";

import cryptoConfig from "../../../../core/bin/config/testnet/crypto.json";
import { describe } from "../../index";
import { FactoryBuilder } from "../factory-builder";
import { registerTransactionFactory } from "./transaction";

describe<{
	factoryBuilder: FactoryBuilder;
}>("TransactionFactory", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		context.factoryBuilder = new FactoryBuilder();
		await registerTransactionFactory(context.factoryBuilder, cryptoConfig);
	});

	it("Transfer - should create a builder", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder.get("Transfer").make();
		assert.undefined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("Transfer - should create a builder with options", async ({ factoryBuilder }) => {
		const options = {
			expiration: 2,
			fee: 2,
			nonce: 1,
			senderPublicKey: "a".repeat(33),
			timestamp: 1,
			vendorField: "Dummy Field",
			version: 2,
		};

		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("Transfer")
			.withOptions(options)
			.withStates("vendorField")
			.make();

		assert.undefined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
		assert.defined(transaction.data.vendorField);

		// TODO: Check all options
	});

	it("Transfer - should create a builder with vendor field", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("Transfer")
			.withStates("vendorField")
			.make();

		assert.undefined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
		assert.defined(transaction.data.vendorField);
	});

	it("Transfer - should sign it with a single passphrase", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("Transfer")
			.withStates("sign")
			.make();

		assert.defined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("Transfer - should sign it with multiple passphrases", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("Transfer")
			.withStates("sign", "multiSign")
			.make();

		assert.defined(transaction.data.signature);
		assert.defined(transaction.data.signatures);
	});

	it("ValidatorRegistration - should create a signature builder", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder.get("ValidatorRegistration").make();

		assert.undefined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("ValidatorRegistration - should sign it with a single passphrase", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("ValidatorRegistration")
			.withStates("sign")
			.make();

		assert.defined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("ValidatorResignation - should create a signature builder", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder.get("ValidatorResignation").make();

		assert.undefined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("ValidatorResignation - should sign it with a single passphrase", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("ValidatorResignation")
			.withStates("sign")
			.make();

		assert.defined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("Vote - should create a builder", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder.get("Vote").make();

		assert.undefined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("Vote - should sign it with a single passphrase", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder.get("Vote").withStates("sign").make();

		assert.defined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("Vote - should sign it with multiple passphrases", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("Vote")
			.withStates("multiSign")
			.make();

		assert.undefined(transaction.data.signature);
		assert.defined(transaction.data.signatures);
	});

	it("Unvote - should create a builder", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder.get("Unvote").make();

		assert.undefined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("Unvote - should sign it with a single passphrase", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder.get("Unvote").withStates("sign").make();

		assert.defined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("Unvote - should sign it with multiple passphrases", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("Unvote")
			.withStates("multiSign")
			.make();

		assert.undefined(transaction.data.signature);
		assert.defined(transaction.data.signatures);
	});

	it("MultiSignature - should create a builder", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder.get("MultiSignature").make();

		assert.undefined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("MultiSignature - should sign it with single passphrase", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("MultiSignature")
			.withStates("sign")
			.make();

		assert.defined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("MultiSignature - should sign it with multiple passphrases", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("MultiSignature")
			.withStates("multiSign")
			.make();

		assert.undefined(transaction.data.signature);
		assert.defined(transaction.data.signatures);
	});

	it("MultiPayment - should create a builder", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder.get("MultiPayment").make();

		assert.undefined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("MultiPayment - should sign it with a single passphrase", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("MultiPayment")
			.withStates("sign")
			.make();

		assert.defined(transaction.data.signature);
		assert.undefined(transaction.data.signatures);
	});

	it("MultiPayment - should sign it with multiple passphrases", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.ITransaction = await factoryBuilder
			.get("MultiPayment")
			.withStates("multiSign")
			.make();

		assert.undefined(transaction.data.signature);
		assert.defined(transaction.data.signatures);
	});
});

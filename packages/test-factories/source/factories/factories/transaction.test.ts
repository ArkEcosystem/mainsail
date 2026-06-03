import type { Contracts } from "@mainsail/contracts";

import cryptoConfig from "../../../../core/bin/config/devnet/core/crypto.json";
import { describe } from "@mainsail/test-runner";
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
		const transaction: Contracts.Crypto.Transaction = await factoryBuilder.get("Transfer").make();
		assert.undefined(transaction.data.signature);
	});

	it("Transfer - should create a builder with options", async ({ factoryBuilder }) => {
		const options = {
			expiration: 2,
			fee: 2,
			nonce: 1,
			senderPublicKey: "a".repeat(33),
			timestamp: 1,
			version: 2,
		};

		const transaction: Contracts.Crypto.Transaction = await factoryBuilder
			.get("Transfer")
			.withOptions(options)
			.make();

		assert.equal(transaction.data.v, 0);
		assert.equal(transaction.data.r, "");
		assert.equal(transaction.data.s, "");
	});

	it("Transfer - should sign it with a single passphrase", async ({ factoryBuilder }) => {
		const transaction: Contracts.Crypto.Transaction = await factoryBuilder
			.get("Transfer")
			.withStates("sign")
			.make();

		assert.defined(transaction.data.v);
		assert.defined(transaction.data.r);
		assert.defined(transaction.data.s);
	});

	// it("ValidatorRegistration - should create a signature builder", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder.get("ValidatorRegistration").make();

	// 	assert.undefined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });

	// it("ValidatorRegistration - should sign it with a single passphrase", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder
	// 		.get("ValidatorRegistration")
	// 		.withStates("sign")
	// 		.make();

	// 	assert.defined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });

	// it("ValidatorResignation - should create a signature builder", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder.get("ValidatorResignation").make();

	// 	assert.undefined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });

	// it("ValidatorResignation - should sign it with a single passphrase", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder
	// 		.get("ValidatorResignation")
	// 		.withStates("sign")
	// 		.make();

	// 	assert.defined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });

	// it("Vote - should create a builder", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder.get("Vote").make();

	// 	assert.undefined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });

	// it("Vote - should sign it with a single passphrase", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder.get("Vote").withStates("sign").make();

	// 	assert.defined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });

	// it("Unvote - should create a builder", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder.get("Unvote").make();

	// 	assert.undefined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });

	// it("Unvote - should sign it with a single passphrase", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder.get("Unvote").withStates("sign").make();

	// 	assert.defined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });

	// it("MultiPayment - should create a builder", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder.get("MultiPayment").make();

	// 	assert.undefined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });

	// it("MultiPayment - should sign it with a single passphrase", async ({ factoryBuilder }) => {
	// 	const transaction: Contracts.Crypto.Transaction = await factoryBuilder
	// 		.get("MultiPayment")
	// 		.withStates("sign")
	// 		.make();

	// 	assert.defined(transaction.data.signature);
	// 	assert.undefined(transaction.data.signatures);
	// });
});

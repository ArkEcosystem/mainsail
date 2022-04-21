import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { describe, Sandbox } from "../../core-test-framework";
import { blockData, blockDataWithTransactions } from "../test/fixtures/block";
import { assertBlockData, assertTransactionData } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";
import { Serializer } from "./serializer";

describe<{
	sandbox: Sandbox;
	serializer: Serializer;
	deserializer: Deserializer;
}>("Serializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.serializer = context.sandbox.app.resolve(Serializer);
		context.deserializer = context.sandbox.app.resolve(Deserializer);
	});

	it("#size - should return size", ({ serializer }) => {
		assert.equal(
			// @ts-ignore
			serializer.size({
				data: blockData,
				transactions: [],
			}),
			204,
		);
	});

	it("#size - should return size with transactions", async ({ serializer, sandbox }) => {
		assert.equal(
			// @ts-ignore
			serializer.size({
				data: blockDataWithTransactions,
				transactions: await Promise.all(
					blockDataWithTransactions.transactions.map(async (tx) =>
						sandbox.app
							.get<Contracts.Crypto.ITransactionFactory>(Identifiers.Cryptography.Transaction.Factory)
							.fromData(tx),
					),
				),
			}),
			584,
		);
	});

	it("#serialize - should serialize and deserialize block", async ({ serializer, deserializer }) => {
		const serialized = await serializer.serialize(blockData);

		const deserialized = await deserializer.deserialize(serialized);

		assertBlockData(assert, deserialized.data, blockData);
	});

	it("#serialize - should serialize and deserialize block with transactions", async ({
		serializer,
		deserializer,
	}) => {
		const serialized = await serializer.serializeWithTransactions(blockDataWithTransactions);

		const deserialized = await deserializer.deserialize(serialized);

		assertBlockData(assert, deserialized.data, blockDataWithTransactions);

		assert.length(deserialized.data.transactions, blockDataWithTransactions.transactions.length);

		for (let index = 0; index < blockDataWithTransactions.transactions.length; index++) {
			assertTransactionData(
				assert,
				deserialized.data.transactions[index],
				blockDataWithTransactions.transactions[index],
			);
		}
	});
});

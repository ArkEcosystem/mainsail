import { describe, Sandbox } from "../../test-framework/source";
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
		assert.equal(serializer.headerSize(), 141);

		assert.equal(serializer.totalSize(blockData), 141);
	});

	it("#size - should return size with transactions", async ({ serializer, sandbox }) => {
		assert.equal(serializer.totalSize(blockDataWithTransactions), 529);
	});

	it("#serialize - should serialize and deserialize block", async ({ serializer, deserializer }) => {
		const serialized = await serializer.serializeHeader(blockData);

		const deserialized = await deserializer.deserializeHeader(serialized);

		assertBlockData(assert, deserialized, blockData);
	});

	it("#serialize - should serialize and deserialize block with transactions", async ({
		serializer,
		deserializer,
	}) => {
		const serialized = await serializer.serializeWithTransactions(blockDataWithTransactions);
		const deserialized = await deserializer.deserializeWithTransactions(serialized);

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

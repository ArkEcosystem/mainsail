import { describe, Sandbox } from "../../core-test-framework";
import { blockData, blockDataWithTransactions, serialized, serializedWithTransactions } from "../test/fixtures/block";
import { assertBlockData, assertTransactionData } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { Deserializer } from "./deserializer";

describe<{
	sandbox: Sandbox;
	deserializer: Deserializer;
}>("Deserializer", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.deserializer = context.sandbox.app.resolve(Deserializer);
	});

	it("#deserialize - should correctly deserialize a block", async ({ deserializer }) => {
		const deserialized = (await deserializer.deserialize(Buffer.from(serialized, "hex"))).data;

		assertBlockData(assert, deserialized, blockData);

		assert.undefined(deserialized.transactions);
	});

	it("#deserialize - should correctly deserialize a block with transactions", async ({ deserializer }) => {
		const deserialized = (await deserializer.deserialize(Buffer.from(serializedWithTransactions, "hex"))).data;

		assertBlockData(assert, deserialized, blockDataWithTransactions);

		assert.length(deserialized.transactions, blockDataWithTransactions.transactions.length);

		for (let index = 0; index < blockDataWithTransactions.transactions.length; index++) {
			assertTransactionData(
				assert,
				deserialized.transactions[index],
				blockDataWithTransactions.transactions[index],
			);
		}
	});

	it("#deserialize - should correctly deserialize a block header with transactions", async ({ deserializer }) => {
		const deserialized = (await deserializer.deserialize(Buffer.from(serializedWithTransactions, "hex"), true))
			.data;

		assertBlockData(assert, deserialized, blockDataWithTransactions);

		assert.undefined(deserialized.transactions);
	});
});

import { Contracts } from "@mainsail/contracts";

import { describe, Sandbox } from "../../test-framework";
import { blockData, blockDataWithTransactions } from "../test/fixtures/block";
import { assertBlockData, assertCommitData, assertTransactionData } from "../test/helpers/asserts";
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
		assert.equal(serializer.headerSize(), 139);

		assert.equal(serializer.totalSize(blockData), 139);
	});

	it("#size - should return size with transactions", async ({ serializer, sandbox }) => {
		assert.equal(serializer.totalSize(blockDataWithTransactions), 519);
	});

	it("#size - should return proof size", async ({ serializer, sandbox }) => {
		assert.equal(serializer.commitSize(), 109);
	});

	it("#serialize - should serialize and deserialize block", async ({ serializer, deserializer }) => {
		const serialized = await serializer.serializeWithTransactions(blockData);

		const deserialized = await deserializer.deserializeWithTransactions(serialized);

		assertBlockData(assert, deserialized.data, blockData);
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

	it("#serialize - should serialize and deserialize commit", async ({ serializer, deserializer }) => {
		const commit = {
			round: 1,
			signature:
				"97a16d3e938a1bc6866701b946e703cfa502d57a226e540f270c16585405378e93086dfb3b32ab2039aa2c197177c66b0fec074df5bfac037efd3dc41d98d50455a69ff1934d503ef69dffa08429f75e5677efca4f2de36d46f8258635e32a95",
			validators: Array.from<boolean>({ length: 51 }).fill(true),
		};

		const serialized = await serializer.serializeCommit(commit);
		const deserialized = await deserializer.deserializeCommit(serialized);

		assertCommitData(assert, deserialized, commit);
	});

});

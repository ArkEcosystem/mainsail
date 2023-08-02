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
		assert.equal(serializer.commitSize(), 145);
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
			blockId: blockData.id,
			height: 1,
			round: 1,
			signature:
				"97a16d3e938a1bc6866701b946e703cfa502d57a226e540f270c16585405378e93086dfb3b32ab2039aa2c197177c66b0fec074df5bfac037efd3dc41d98d50455a69ff1934d503ef69dffa08429f75e5677efca4f2de36d46f8258635e32a95",
			validators: new Array(51).fill(true),
		};

		const serialized = await serializer.serializeCommit(commit);
		const deserialized = await deserializer.deserializeCommit(serialized);

		assertCommitData(assert, deserialized, commit);
	});

	it("#serialize - should serialize and deserialize lock proof", async ({ deserializer, serializer }) => {
		const proposalLockProof: Contracts.Crypto.IProposalLockProof = {
			signature:
				"927628d67c385fe216aa800def9cce0c09f5f9fbf836583d7c07ab6a98e1b5681802c92f81ad54984236a07fa389dbab1519f3c91ad39a505a61c3624a88c65da71fe721d7af0ed452516771b94d027be713dba68e14fa2c9680e35b63f0e038",
			validators: [true, true, true, false, false, true, true, true, true, false],
		};

		const serializedProposalLockProof =
			"927628d67c385fe216aa800def9cce0c09f5f9fbf836583d7c07ab6a98e1b5681802c92f81ad54984236a07fa389dbab1519f3c91ad39a505a61c3624a88c65da71fe721d7af0ed452516771b94d027be713dba68e14fa2c9680e35b63f0e0380ae701000000000000";

		const serialized = (await serializer.serializeLockProof(proposalLockProof)).toString("hex");
		assert.equal(serialized, serializedProposalLockProof);

		const deserialized = await deserializer.deserializeLockProof(Buffer.from(serialized, "hex"));
		assert.equal(proposalLockProof.signature, deserialized.signature);
		assert.equal(proposalLockProof.validators, deserialized.validators);
	});
});

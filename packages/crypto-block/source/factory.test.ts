import { Contracts, Identifiers, Utils } from "@mainsail/contracts";
import clone from "lodash.clone";

import { describe, Sandbox } from "../../test-framework/source";
import {
	blockData,
	blockDataJson,
	blockDataWithTransactions,
	blockDataWithTransactionsJson,
	serialized,
	serializedWithTransactions,
} from "../test/fixtures/block";
import { assertBlockData, assertTransactionData } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { BlockFactory } from "./factory";
import { schemas } from "./schemas";
import { Serializer } from "./serializer";

describe<{
	expectBlock: ({ data }: { data: Contracts.Crypto.BlockData }) => void;
	sandbox: Sandbox;
	factory: BlockFactory;
	serializer: Serializer;
}>("Factory", ({ it, assert, beforeEach }) => {
	const blockDataOriginal = clone(blockData);
	// Recalculated id
	const blockDataWithTransactionsOriginal = clone(blockDataWithTransactions);
	let blockDataClone: Utils.Mutable<Contracts.Crypto.BlockData>;
	let blockDataWithTransactionsClone: Utils.Mutable<Contracts.Crypto.BlockData>;

	beforeEach(async (context) => {
		blockDataClone = clone(blockDataOriginal);
		blockDataWithTransactionsClone = clone(blockDataWithTransactionsOriginal);

		await prepareSandbox(context);

		for (const schema of Object.values(schemas)) {
			context.sandbox.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}

		context.factory = context.sandbox.app.resolve(BlockFactory);
		context.serializer = context.sandbox.app.resolve(Serializer);
	});

	it("#make - should make a block", async ({ factory, sandbox }) => {
		const block = await factory.make(blockData, []);

		assertBlockData(assert, block.data, blockData);
		assertBlockData(assert, block.header, blockData);
		assert.equal(block.transactions, []);
		assert.string(block.serialized);
	});

	it("#make - should make a block with transactions", async ({ factory }) => {
		const block = await factory.make(blockDataWithTransactions, [
			{ data: blockDataWithTransactions.transactions[0] },
			{ data: blockDataWithTransactions.transactions[1] },
		]);

		assertBlockData(assert, block.data, blockDataWithTransactions);
		assertBlockData(assert, block.header, blockDataWithTransactions);
		assert.length(block.transactions, blockDataWithTransactions.transactions.length);
		assert.string(block.serialized);

		for (let index = 0; index < blockDataWithTransactions.transactions.length; index++) {
			assertTransactionData(
				assert,
				block.transactions[index].data,
				blockDataWithTransactions.transactions[index],
			);
		}
	});

	it("#fromHex - should create a block instance from hex", async ({ factory }) => {
		const block = await factory.fromHex(serialized);

		assertBlockData(assert, block.data, blockDataClone);
		assertBlockData(assert, block.header, blockDataClone);
		assert.equal(block.transactions, []);
		assert.equal(block.serialized, serialized);
	});

	it("#fromHex - should create a block instance with transactions from hex", async ({ factory }) => {
		const block = await factory.fromHex(serializedWithTransactions);

		assertBlockData(assert, block.data, blockDataWithTransactionsClone);
		assertBlockData(assert, block.header, blockDataWithTransactionsClone);
		assert.equal(block.serialized, serializedWithTransactions);

		assert.length(block.transactions, blockDataWithTransactionsClone.transactions.length);
	});

	it("#fromBytes - should create a block instance from a buffer", async ({ factory }) => {
		const block = await factory.fromBytes(Buffer.from(serialized, "hex"));

		assertBlockData(assert, block.data, blockDataClone);
		assertBlockData(assert, block.header, blockDataClone);
		assert.equal(block.transactions, []);
		assert.equal(block.serialized, serialized);
	});

	it("#fromBytes - should create a block with transactions instance from a buffer", async ({ factory }) => {
		const block = await factory.fromBytes(Buffer.from(serializedWithTransactions, "hex"));

		assertBlockData(assert, block.data, blockDataWithTransactionsClone);
		assertBlockData(assert, block.header, blockDataWithTransactionsClone);
		assert.equal(block.serialized, serializedWithTransactions);

		assert.length(block.transactions, blockDataWithTransactionsClone.transactions.length);
	});

	it("#fromData - should create a block instance from an object", async (context) => {
		const block = await context.factory.fromData(blockData);

		assertBlockData(assert, block.data, blockData);
		assertBlockData(assert, block.header, blockData);
		assert.equal(block.transactions, []);
		assert.string(block.serialized);
	});

	it("#fromData - should create a block with transactions instance from an object", async (context) => {
		const block = await context.factory.fromData(blockDataWithTransactions);

		assertBlockData(assert, block.data, blockDataWithTransactions);
		assertBlockData(assert, block.header, blockDataWithTransactions);
		assert.string(block.serialized);

		for (let index = 0; index < blockDataWithTransactions.transactions.length; index++) {
			assertTransactionData(
				assert,
				block.transactions[index].data,
				blockDataWithTransactions.transactions[index],
			);
		}
	});

	it("#fromData - should throw on invalid input data - block property has an unexpected value", async ({
		factory,
	}) => {
		const b2 = Object.assign({}, blockData, { totalAmount: "abcd" });
		await assert.rejects(
			() => factory.fromData(b2),
			'Invalid data at /totalAmount: must pass "bignumber" keyword validation: undefined',
		);
	});

	it("#fromData - should throw on invalid input data - required block property is missing", async ({ factory }) => {
		const partialBlock = {
			...blockDataClone,
			generatorPublicKey: undefined,
		} as unknown as Contracts.Crypto.BlockData;

		await assert.rejects(
			() => factory.fromData(partialBlock),
			" Invalid data: must have required property 'generatorPublicKey': undefined",
		);
	});

	it("#fromData - should throw on invalid transaction data", async ({ factory }) => {
		delete blockDataWithTransactionsClone.transactions[0].id;

		await assert.rejects(
			() => factory.fromData(blockDataWithTransactionsClone),
			"Invalid data at /transactions/0: must have required property 'id': undefined",
		);
	});

	it("#fromJson - should create a block instance from JSON", async ({ factory }) => {
		const block = await factory.fromJson(blockDataJson);

		// Recalculated id
		blockDataClone.id = blockDataJson.id;

		assertBlockData(assert, block.data, blockDataClone);
		assertBlockData(assert, block.header, blockDataClone);
		assert.equal(block.transactions, []);
		assert.string(block.serialized);
	});

	it("#fromJson - should create a block instance with transactions from JSON", async ({ factory }) => {
		const block = await factory.fromJson(blockDataWithTransactionsJson);

		// Recalculated id
		blockDataWithTransactionsClone.id = blockDataWithTransactionsJson.id;

		assertBlockData(assert, block.data, blockDataWithTransactionsClone);
		assertBlockData(assert, block.header, blockDataWithTransactionsClone);
		assert.string(block.serialized);
		assert.length(block.transactions, blockDataWithTransactionsClone.transactions.length);

		for (let index = 0; index < blockDataWithTransactionsClone.transactions.length; index++) {
			// Recalculated id
			blockDataWithTransactionsClone.transactions[index].id = block.transactions[index].data.id;

			assertTransactionData(
				assert,
				block.transactions[index].data,
				blockDataWithTransactionsClone.transactions[index],
			);
		}
	});
});

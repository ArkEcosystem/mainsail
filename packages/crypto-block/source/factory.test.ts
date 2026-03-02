import type { Contracts, Utils } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import clone from "lodash.clonedeep";

import { BlockSchemaError, InvalidBlockBytesError } from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import {
	blockData,
	blockDataJson,
	blockHeaderStorage,
	blockDataWithTransactions,
	blockDataWithTransactionsJson,
	blockHeaderWithTransactionsStorage,
	serialized,
	serializedWithTransactions,
	transactionsFromStorage,
	transactionsData,
} from "../test/fixtures/index.js";
import { assertBlockData, assertTransactionData } from "../test/helpers/asserts";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { BlockFactory } from "./factory";
import { schemas } from "./schemas";
import { Serializer } from "./serializer";

describe<{
	expectBlock: ({ data }: { data: Contracts.Crypto.BlockData }) => void;
	app: Application;
	factory: BlockFactory;
	txFactory: Contracts.Crypto.TransactionFactory;
	serializer: Serializer;
}>("Factory", ({ it, assert, beforeEach }) => {
	const blockDataOriginal = clone(blockData);
	const blockDataWithTransactionsOriginal = clone(blockDataWithTransactions);
	let blockDataClone: Utils.Mutable<Contracts.Crypto.BlockData>;
	let blockDataWithTransactionsClone: Utils.Mutable<Contracts.Crypto.BlockData>;

	beforeEach(async (context) => {
		blockDataClone = clone(blockDataOriginal);
		blockDataWithTransactionsClone = clone(blockDataWithTransactionsOriginal);

		await prepareSandbox(context);

		for (const schema of Object.values(schemas)) {
			context.app.get<Contracts.Crypto.Validator>(Identifiers.Cryptography.Validator).addSchema(schema);
		}

		context.factory = context.app.resolve(BlockFactory);
		context.serializer = context.app.resolve(Serializer);
		context.txFactory = context.app.get<Contracts.Crypto.TransactionFactory>(
			Identifiers.Cryptography.Transaction.Factory,
		);
	});

	it("#make - should make a block", async ({ factory }) => {
		const block = await factory.make(blockData, []);

		assertBlockData(assert, block, blockData);
		assert.equal(block.transactions, []);
		assert.equal(block.serialized, serialized);
	});

	it("#make - should make a block with transactions", async ({ factory, txFactory }) => {
		const transactions = await Promise.all(
			blockDataWithTransactionsOriginal.transactions.map(
				async (transaction) => await txFactory.fromData(transaction),
			),
		);

		const block = await factory.make(blockDataWithTransactionsOriginal, transactions);

		assertBlockData(assert, block, blockDataWithTransactionsOriginal);
		assert.length(block.transactions, transactions.length);
		assert.equal(block.serialized, serializedWithTransactions);

		for (let index = 0; index < transactions.length; index++) {
			assertTransactionData(assert, block.transactions[index], transactions[index]);
		}
	});

	it("#make - should throw if it is not verified", async ({ factory }) => {
		await assert.rejects(() => factory.make({ ...blockData, transactionsCount: 6 }, []), BlockSchemaError);
	});

	it("#fromHex - should create a block instance from hex", async ({ factory }) => {
		const block = await factory.fromHex(serialized);

		assertBlockData(assert, block, blockDataClone);
		assert.equal(block.transactions, []);
		assert.equal(block.serialized, serialized);
	});

	it("#fromHex - should create a block instance with transactions from hex", async ({ factory }) => {
		const block = await factory.fromHex(serializedWithTransactions);

		assertBlockData(assert, block, blockDataWithTransactionsClone);
		assert.equal(block.serialized, serializedWithTransactions);

		assert.length(block.transactions, blockDataWithTransactionsClone.transactions.length);
	});

	it("#fromHex - should reject block with trailing bytes", async ({ factory }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			await assert.rejects(async () => factory.fromHex(serialized + hex), InvalidBlockBytesError);
		}
	});

	it("#fromHex - should reject block with leading bytes", async ({ factory }) => {
		for (const hex of ["00", "01", "430123231", "aaaaaaaaaaaaaaaa", "0".repeat(255)]) {
			await assert.rejects(async () => factory.fromHex(hex + serialized), InvalidBlockBytesError);
		}
	});

	it("#fromBytes - should create a block instance from a buffer", async ({ factory }) => {
		const block = await factory.fromBytes(Buffer.from(serialized, "hex"));

		assertBlockData(assert, block, blockDataClone);
		assert.equal(block.transactions, []);
		assert.equal(block.serialized, serialized);
	});

	it("#fromBytes - should create a block with transactions instance from a buffer", async ({ factory }) => {
		const block = await factory.fromBytes(Buffer.from(serializedWithTransactions, "hex"));

		assertBlockData(assert, block, blockDataWithTransactionsClone);
		assert.equal(block.serialized, serializedWithTransactions);

		assert.length(block.transactions, blockDataWithTransactionsClone.transactions.length);
	});

	it("#fromStorage - should create a block header from storage", async ({ factory }) => {
		const blockHeaderFromStorage = await factory.fromStorage(blockHeaderStorage, []);

		assertBlockData(assert, blockHeaderFromStorage, blockData);
		assert.equal(blockHeaderFromStorage.serialized, serialized);
		assert.equal(blockHeaderFromStorage.transactions.length, 0);

		const blockHeaderFromStorageWithTransactions = await factory.fromStorage(
			blockHeaderWithTransactionsStorage,
			transactionsFromStorage,
		);
		assertBlockData(assert, blockHeaderFromStorageWithTransactions, blockDataWithTransactionsClone);
		assert.equal(blockHeaderFromStorageWithTransactions.serialized, serializedWithTransactions);

		assert.equal(blockHeaderFromStorageWithTransactions.transactions.length, transactionsFromStorage.length);
		assert.equal(blockHeaderFromStorageWithTransactions.transactions[0].toData(), transactionsData[0]);
		assert.equal(blockHeaderFromStorageWithTransactions.transactions[1].toData(), transactionsData[1]);

		assert.equal(blockHeaderFromStorageWithTransactions.transactions[0].transactionIndex, 0);
		assert.equal(blockHeaderFromStorageWithTransactions.transactions[1].transactionIndex, 1);

		assert.equal(
			blockHeaderFromStorageWithTransactions.transactions[0].blockNumber,
			blockDataWithTransactionsClone.number,
		);
		assert.equal(
			blockHeaderFromStorageWithTransactions.transactions[1].blockNumber,
			blockDataWithTransactionsClone.number,
		);
		assert.equal(
			blockHeaderFromStorageWithTransactions.transactions[0].blockHash,
			blockDataWithTransactionsClone.hash,
		);
		assert.equal(
			blockHeaderFromStorageWithTransactions.transactions[1].blockHash,
			blockDataWithTransactionsClone.hash,
		);
	});

	it("#headerFromStorage - should create a block header from storage", async ({ factory }) => {
		const blockHeaderFromStorage = await factory.headerFromStorage(blockHeaderStorage);

		assertBlockData(assert, blockHeaderFromStorage, blockData);
		assert.undefined(blockHeaderFromStorage.serialized);
		assert.undefined(blockHeaderFromStorage.transactions);

		const blockHeaderFromStorageWithTransactions = await factory.headerFromStorage(
			blockHeaderWithTransactionsStorage,
		);
		assertBlockData(assert, blockHeaderFromStorageWithTransactions, blockDataWithTransactionsClone);
		assert.undefined(blockHeaderFromStorageWithTransactions.serialized);
		assert.undefined(blockHeaderFromStorageWithTransactions.transactions);
	});

	it("#fromData - should create a block instance from an object", async (context) => {
		const block = await context.factory.fromData(blockData);

		assertBlockData(assert, block, blockData);
		assert.equal(block.transactions, []);
		assert.string(block.serialized);
	});

	it("#fromData - should create a block with transactions instance from an object", async (context) => {
		const block = await context.factory.fromData(blockDataWithTransactionsOriginal);

		assertBlockData(assert, block, blockDataWithTransactionsOriginal);
		assert.string(block.serialized);

		for (let index = 0; index < blockDataWithTransactionsOriginal.transactions.length; index++) {
			assertTransactionData(
				assert,
				block.transactions[index],
				blockDataWithTransactionsOriginal.transactions[index],
			);
		}
	});

	it("#fromData - should throw on invalid input data - block property has an unexpected value", async ({
		factory,
	}) => {
		const b2 = Object.assign({}, blockData, { fee: "abcd" });

		await assert.rejects(
			() => factory.fromData(b2),
			`Height (2): data/fee must pass "bignumber" keyword validation`,
		);
	});

	it("#fromData - should throw on invalid input data - required block property is missing", async ({ factory }) => {
		const partialBlock = {
			...blockDataClone,
			proposer: undefined,
		} as unknown as Contracts.Crypto.BlockData;

		await assert.rejects(
			() => factory.fromData(partialBlock),
			"Height (2): data must have required property 'proposer'",
		);
	});

	it("#fromJson - should create a block instance from JSON", async ({ factory }) => {
		const block = await factory.fromJson(blockDataJson);

		assertBlockData(assert, block, blockDataClone);
		assert.equal(block.transactions, []);
		assert.string(block.serialized);
	});

	it("#fromJson - should create a block instance with transactions from JSON", async ({ factory }) => {
		const block = await factory.fromJson(blockDataWithTransactionsJson);

		assertBlockData(assert, block, blockDataWithTransactionsClone);
		assert.string(block.serialized);
		assert.length(block.transactions, blockDataWithTransactionsClone.transactions.length);

		for (let index = 0; index < blockDataWithTransactionsClone.transactions.length; index++) {
			assertTransactionData(
				assert,
				block.transactions[index],
				blockDataWithTransactionsClone.transactions[index],
			);
		}
	});

	it("#fromJson - should throw if invalid input data", async ({ factory }) => {
		await assert.rejects(() => factory.fromJson({ ...blockDataJson, transactionsCount: 6 }), BlockSchemaError);
	});
});

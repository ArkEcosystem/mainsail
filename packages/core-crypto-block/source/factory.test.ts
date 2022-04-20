import { describe } from "../../core-test-framework";
import { blockWithExceptions, dummyBlock } from "../../test/fixtures/block";
import { BlockFactory, Serializer } from "../blocks";
import { IBlockData } from "../interfaces";
import { configManager } from "../managers";

describe<{
	expectBlock: ({ data }: { data: IBlockData }) => void;
}>("BlockFactory", ({ it, assert, beforeEach, beforeAll }) => {
	beforeAll((context) => {
		context.expectBlock = ({ data }: { data: IBlockData }) => {
			delete data.idHex;

			const blockWithoutTransactions: IBlockData = { ...dummyBlock };
			blockWithoutTransactions.reward = blockWithoutTransactions.reward;
			blockWithoutTransactions.totalAmount = blockWithoutTransactions.totalAmount;
			blockWithoutTransactions.totalFee = blockWithoutTransactions.totalFee;
			delete blockWithoutTransactions.transactions;

			assert.equal(data, blockWithoutTransactions);
		};
	});

	beforeEach(() => configManager.setFromPreset("devnet"));

	it("fromHex - should create a block instance from hex", (context) => {
		context.expectBlock(BlockFactory.fromHex(Serializer.serializeWithTransactions(dummyBlock).toString("hex")));
	});

	it("fromBytes - should create a block instance from a buffer", (context) => {
		context.expectBlock(BlockFactory.fromBytes(Serializer.serializeWithTransactions(dummyBlock)));
	});

	it("fromData - should create a block instance from an object", (context) => {
		context.expectBlock(BlockFactory.fromData(dummyBlock));
	});

	it("fromData - should throw on invalid input data - block property has an unexpected value", () => {
		const b1 = Object.assign({}, blockWithExceptions, { timestamp: "abcd" });
		assert.throws(() => BlockFactory.fromData(b1));

		const b2 = Object.assign({}, blockWithExceptions, { totalAmount: "abcd" });
		assert.throws(() => BlockFactory.fromData(b2));
	});

	it("fromData - should throw on invalid input data - required block property is missing", () => {
		const b = Object.assign({}, blockWithExceptions);
		delete b.generatorPublicKey;
		assert.throws(() => BlockFactory.fromData(b));
	});

	it("fromData - should throw on invalid transaction data", () => {
		const b = Object.assign({}, dummyBlock);
		const txId = b.transactions[1].id;

		delete b.transactions[1].id;

		assert.throws(() => BlockFactory.fromData(b));

		// Revert changes...
		b.transactions[1].id = txId;
	});

	it("fromJson - should create a block instance from JSON", (context) => {
		context.expectBlock(BlockFactory.fromJson(BlockFactory.fromData(dummyBlock).toJson()));
	});
});

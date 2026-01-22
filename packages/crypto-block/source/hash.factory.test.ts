import { describe, Sandbox } from "@mainsail/test-framework";
import { blockData, blockDataWithTransactions } from "../test/fixtures/block";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { HashFactory } from "./hash.factory";

describe<{
	sandbox: Sandbox;
	hashFactory: HashFactory;
}>("IdFactory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.hashFactory = context.sandbox.app.resolve(HashFactory);
	});

	it("#make - should return block id", async ({ hashFactory }) => {
		const id = await hashFactory.make(blockData);

		assert.string(id);
		assert.equal(id, blockData.hash);
	});

	it("#make - should return block id with transactions", async ({ hashFactory }) => {
		const id = await hashFactory.make(blockDataWithTransactions);

		assert.string(id);
		assert.equal(id, blockDataWithTransactions.hash);
	});
});

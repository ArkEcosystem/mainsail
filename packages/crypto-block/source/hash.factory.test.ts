import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { blockData, blockDataWithTransactions } from "../test/fixtures/block";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { HashFactory } from "./hash.factory";

describe<{
	app: Application;
	hashFactory: HashFactory;
}>("IdFactory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.hashFactory = context.app.resolve(HashFactory);
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

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { blockData, blockDataWithTransactions } from "../test/fixtures/block";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { HashFactory } from "./hash.factory";

describe<{
	app: Application;
	hashFactory: HashFactory;
}>("HashFactory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.hashFactory = context.app.resolve(HashFactory);
	});

	it("#make - should return block hash", async ({ hashFactory }) => {
		const hash = await hashFactory.make(blockData);

		assert.string(hash);
		assert.equal(hash, blockData.hash);
	});

	it("#make - should return block hash with transactions", async ({ hashFactory }) => {
		const hash = await hashFactory.make(blockDataWithTransactions);

		assert.string(hash);
		assert.equal(hash, blockDataWithTransactions.hash);
	});
});

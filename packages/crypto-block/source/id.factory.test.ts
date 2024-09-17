import { describe, Sandbox } from "../../test-framework/source";
import { blockData, blockDataWithTransactions } from "../test/fixtures/block";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { IDFactory } from "./id.factory";

describe<{
	sandbox: Sandbox;
	idFactory: IDFactory;
}>("IdFactory", ({ it, assert, beforeEach }) => {
	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.idFactory = context.sandbox.app.resolve(IDFactory);
	});

	it("#make - should return block id", async ({ idFactory }) => {
		const id = await idFactory.make(blockData);

		assert.string(id);
		assert.equal(id, blockData.id);
	});

	it("#make - should return block id with transactions", async ({ idFactory }) => {
		const id = await idFactory.make(blockDataWithTransactions);

		assert.string(id);
		assert.equal(id, blockDataWithTransactions.id);
	});
});

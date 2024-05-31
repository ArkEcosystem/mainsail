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
		assert.equal(id, "6fcb5df2fca0ccb57b042316fedd5f641d5876ac04ffc871be23b7623ebb94cc");
	});

	it("#make - should return block id with transactions", async ({ idFactory }) => {
		const id = await idFactory.make(blockDataWithTransactions);

		assert.string(id);
		assert.equal(id, "b05832374b8f194cd212974d9f9a83498bb31701fbbac234072ef14d3229244c");
	});
});

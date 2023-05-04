import { Exceptions, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "../../../../test-framework";

import { GetCommonBlocksController } from "./get-common-blocks";

describe<{
	sandbox: Sandbox;
	controller: GetCommonBlocksController;
}>("GetCommonBlocksController", ({ it, assert, beforeEach, stub }) => {
	const database = { getBlock: () => {} };
	const blockchain = {
		getLastBlock: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue(database);
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchain);

		context.controller = context.sandbox.app.resolve(GetCommonBlocksController);
	});

	it("should return the last common block found and the last height", async ({ controller }) => {
		const blocks = [
			{ height: 2, id: "123456789" },
			{ height: 3, id: "111116789" },
		];
		const request = { payload: { ids: blocks.map((block) => block.id) } };

		stub(database, "getBlock").resolvedValueSequence(blocks);
		const height = 1433;
		stub(blockchain, "getLastBlock").returnValue({ data: { height: 1433 } });

		const commonBlocks = await controller.handle(request, {});

		assert.equal(commonBlocks, {
			common: blocks[1],
			lastBlockHeight: height,
		});
	});

	it("should throw MissingCommonBlockError when no common block found", async ({ controller }) => {
		const request = { payload: { ids: ["123456789", "111116789"] } };
		stub(database, "getBlock").resolvedValue(undefined);

		await assert.rejects(() => controller.handle(request, {}), Exceptions.MissingCommonBlockError);
	});
});

import { Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "../../../../test-framework";

import { GetBlocksController } from "./get-blocks";

describe<{
	sandbox: Sandbox;
	controller: GetBlocksController;
}>("GetBlocksController", ({ it, assert, beforeEach, spy, match, stub }) => {
	const logger = { debug: () => {}, info: () => {}, warning: () => {} };
	const database = { getBlocksForDownload: () => {} };
	const blockchain = {
		getLastDownloadedBlock: () => {},
		getLastHeight: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue(database);
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchain);

		context.controller = context.sandbox.app.resolve(GetBlocksController);
	});

	it("should use database.getBlocksForDownload to get the blocks according to the request params", async ({
		controller,
	}) => {
		const mockBlocks = [{}];
		const spyGetBlocksForDownload = stub(database, "getBlocksForDownload").returnValue(mockBlocks);

		const payload = {
			blockLimit: 100,
			lastBlockHeight: 1,
		};
		const ip = "187.55.33.22";

		const blocks = await controller.handle({ info: { remoteAddress: ip }, payload }, {});

		assert.equal(blocks, mockBlocks);
		spyGetBlocksForDownload.calledOnce();
		spyGetBlocksForDownload.calledWith(payload.lastBlockHeight + 1, payload.blockLimit);
	});
});

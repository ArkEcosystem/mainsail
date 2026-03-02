import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { GetBlocksController } from "./get-blocks";

describe<{
	app: Application;
	controller: GetBlocksController;
}>("GetBlocksController", ({ it, assert, beforeEach, stub }) => {
	const logger = { debug: () => {}, info: () => {}, warn: () => {} };
	const database = { findCommitBuffers: () => {} };
	const store = {
		getLastDownloadedBlock: () => {},
		getBlockNumber: () => {},
	};

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.app.bind(Identifiers.Database.Service).toConstantValue(database);
		context.app.bind(Identifiers.State.Store).toConstantValue(store);

		context.controller = context.app.resolve(GetBlocksController);
	});

	it("should use database.findCommitBuffers to get the blocks according to the request params", async ({
		controller,
	}) => {
		const mockBlocks = [Buffer.from("")];
		const spyGetBlocksForDownload = stub(database, "findCommitBuffers").returnValue(mockBlocks);

		const payload = {
			fromBlockNumber: 1,
			limit: 100,
		};
		const ip = "187.55.33.22";

		const response = await controller.handle({ info: { remoteAddress: ip }, payload }, {});

		assert.equal(response, { blocks: mockBlocks });
		spyGetBlocksForDownload.calledOnce();
		spyGetBlocksForDownload.calledWith(payload.fromBlockNumber, payload.fromBlockNumber + payload.limit - 1);
	});
});

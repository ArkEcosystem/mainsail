import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../../test-framework/source";
import { GetBlocksController } from "./get-blocks";

describe<{
	sandbox: Sandbox;
	controller: GetBlocksController;
}>("GetBlocksController", ({ it, assert, beforeEach, stub }) => {
	const logger = { debug: () => {}, info: () => {}, warning: () => {} };
	const database = { findCommitBuffers: () => {} };
	const store = {
		getLastDownloadedBlock: () => {},
		getHeight: () => {},
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue(database);
		context.sandbox.app.bind(Identifiers.State.Store).toConstantValue(store);

		context.controller = context.sandbox.app.resolve(GetBlocksController);
	});

	it("should use database.findCommitBuffers to get the blocks according to the request params", async ({
		controller,
	}) => {
		const mockBlocks = [Buffer.from("")];
		const spyGetBlocksForDownload = stub(database, "findCommitBuffers").returnValue(mockBlocks);

		const payload = {
			fromHeight: 1,
			limit: 100,
		};
		const ip = "187.55.33.22";

		const response = await controller.handle({ info: { remoteAddress: ip }, payload }, {});

		assert.equal(response, { blocks: mockBlocks });
		spyGetBlocksForDownload.calledOnce();
		spyGetBlocksForDownload.calledWith(payload.fromHeight, payload.fromHeight + payload.limit - 1);
	});
});

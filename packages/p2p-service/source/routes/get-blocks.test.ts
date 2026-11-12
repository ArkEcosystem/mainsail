import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { constants } from "../constants.js";
import { GetBlocks, GetBlocksRoute } from "./get-blocks";

describe<{
	app: Application;
	route: GetBlocksRoute;
}>("GetBlocksRoute", ({ it, assert, beforeEach, stub }) => {
	const logger = { debug: () => {}, info: () => {}, warn: () => {} };
	const database = { findCommitBuffers: () => {} };
	const store = { getBlockNumber: () => 1000 };
	const connection = { remoteAddress: "187.55.33.22" } as any;

	const budget = (limit: number) =>
		GetBlocks.maxPayload.response - constants.RESPONSE_ENVELOPE_RESERVE - limit * constants.PROTO_BLOCK_OVERHEAD;

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.app.bind(Identifiers.Database.Service).toConstantValue(database);
		context.app.bind(Identifiers.State.Store).toConstantValue(store);

		context.route = context.app.resolve(GetBlocksRoute);
	});

	it("should read the requested range from the database within the byte budget of the route", async ({ route }) => {
		const blocks = [Buffer.from("")];
		const findCommitBuffers = stub(database, "findCommitBuffers").returnValue(blocks);

		const response = await route.handle(connection, { fromBlockNumber: 1, limit: 100 });

		assert.equal(response, { blocks });
		findCommitBuffers.calledWith(1, 100, budget(100));
	});

	it("should cap the limit at the maximum batch and never ask for fewer than one block", async ({ route }) => {
		const findCommitBuffers = stub(database, "findCommitBuffers").returnValue([]);

		await route.handle(connection, { fromBlockNumber: 1, limit: constants.MAX_DOWNLOAD_BLOCKS * 10 });
		findCommitBuffers.calledWith(1, constants.MAX_DOWNLOAD_BLOCKS, budget(constants.MAX_DOWNLOAD_BLOCKS));

		await route.handle(connection, { fromBlockNumber: 1, limit: 0 });
		findCommitBuffers.calledWith(1, 1, budget(1));
	});

	it("should default to the maximum batch from block 0 and clamp a negative start", async ({ route }) => {
		const findCommitBuffers = stub(database, "findCommitBuffers").returnValue([]);

		await route.handle(connection, {});
		findCommitBuffers.calledWith(0, constants.MAX_DOWNLOAD_BLOCKS - 1, budget(constants.MAX_DOWNLOAD_BLOCKS));

		await route.handle(connection, { fromBlockNumber: -5, limit: 10 });
		findCommitBuffers.calledWith(0, 9, budget(10));
	});

	it("should answer with no blocks when the range starts beyond our chain", async ({ route }) => {
		const findCommitBuffers = stub(database, "findCommitBuffers");

		const response = await route.handle(connection, { fromBlockNumber: 1001, limit: 10 });

		assert.equal(response, { blocks: [] });
		findCommitBuffers.neverCalled();
	});
});

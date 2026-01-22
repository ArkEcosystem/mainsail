import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { EvmInstance } from "@mainsail/evm-service/distribution/instances/index.js";

import { DatabaseService } from "../source/database-service";
import { describe, Sandbox } from "@mainsail/test-framework";
import { prepareSandbox } from "../test/helpers/prepare-sandbox";
import { setGracefulCleanup } from "tmp";

describe<{
	sandbox: Sandbox;
	evm: Contracts.Evm.Instance;
	databaseService: Contracts.Database.DatabaseService;
}>("DatabaseService", ({ it, afterAll, afterEach, beforeEach, assert }) => {
	afterAll(() => setGracefulCleanup());

	afterEach(async (context) => {
		await context.evm.dispose();
	});

	beforeEach(async (context) => {
		await prepareSandbox(context);

		context.sandbox.app
			.bind(Identifiers.Evm.Instance)
			.to(EvmInstance)
			.inSingletonScope()
			.whenTagged("instance", "evm");

		context.evm = context.sandbox.app.getTagged<Contracts.Evm.Instance>(
			Identifiers.Evm.Instance,
			"instance",
			"evm",
		);

		context.databaseService = context.sandbox.app.resolve(DatabaseService);
		await context.databaseService.initialize();
	});

	beforeEach(async (context) => {
		await prepareSandbox(context);
	});

	it("getState - should be ok", async ({ databaseService }) => {
		const state = databaseService.getState();
		assert.equal(state, {
			blockNumber: 0,
			totalRound: 0,
		});
	});

	it("isEmpty - should be ok", async ({ databaseService }) => {
		assert.true(await databaseService.isEmpty());
	});

	it("getLastCommit - should throw when empty", async ({ databaseService }) => {
		await assert.rejects(async () => databaseService.getLastCommit(), "Database is empty");
	});

	it("hasCommitByHash - should be ok", async ({ databaseService }) => {
		const result = await databaseService.hasCommitByHash(
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		assert.false(result);
	});

	it("getBlock - should be ok", async ({ databaseService }) => {
		const block = await databaseService.getBlock(0);
		assert.undefined(block);
	});

	it("getBlockByHash - should be ok", async ({ databaseService }) => {
		const block = await databaseService.getBlockByHash(
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		assert.undefined(block);
	});

	it("getBlockHeader - should be ok", async ({ databaseService }) => {
		const block = await databaseService.getBlockHeader(0);
		assert.undefined(block);
	});

	it("getBlockHeaderByHash - should be ok", async ({ databaseService }) => {
		const block = await databaseService.getBlockHeaderByHash(
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		assert.undefined(block);
	});

	it("findBlocks - should be ok", async ({ databaseService }) => {
		const blocks = await databaseService.findBlocks(1, 2);
		assert.empty(blocks);
	});

	it("findCommitBuffers - should be ok", async ({ databaseService }) => {
		const commits = await databaseService.findCommitBuffers(1, 2);
		assert.empty(commits);
	});

	it("readCommits - should be ok", async ({ databaseService }) => {
		const commits = [];
		for await (const commit of databaseService.readCommits(1, 2)) {
			commits.push(commit);
		}

		assert.empty(commits);
	});

	it("onCommit - should be ok", async ({ databaseService }) => {
		assert.equal(databaseService.getState(), {
			blockNumber: 0,
			totalRound: 0,
		});

		await databaseService.onCommit({
			getCommit: async () => ({
				block: { data: { number: 2 } },
				proof: { round: 0 },
			}),
		} as Contracts.Processor.ProcessableUnit);

		assert.equal(databaseService.getState(), {
			blockNumber: 2,
			totalRound: 1,
		});
	});

	it("getTransactionByHash - should be ok", async ({ databaseService }) => {
		const transaction = await databaseService.getTransactionByHash(
			"0000000000000000000000000000000000000000000000000000000000000000",
		);
		assert.undefined(transaction);
	});

	it("getTransactionByBlockHashAndIndex - should be ok", async ({ databaseService }) => {
		const transaction = await databaseService.getTransactionByBlockHashAndIndex(
			"0000000000000000000000000000000000000000000000000000000000000000",
			0,
		);
		assert.undefined(transaction);
	});

	it("getTransactionByBlockNumberAndIndex - should be ok", async ({ databaseService }) => {
		const transaction = await databaseService.getTransactionByBlockNumberAndIndex(1, 0);
		console.log(transaction);
		assert.undefined(transaction);
	});
});

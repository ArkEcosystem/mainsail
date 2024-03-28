import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight, assertCommitValidators } from "./asserts.js";
import { P2PRegistry } from "./p2p.js";
import { run, setup, stop } from "./setup.js";
import { getLastCommit, prepareNodeValidators, snoozeForBlock } from "./utils.js";

describe<{
	node0: Sandbox;
	node1: Sandbox;
}>("Base", ({ beforeEach, afterEach, it, assert }) => {
	const allValidators = new Array(validators.secrets.length).fill(true);

	beforeEach(async (context) => {
		const p2pRegistry = new P2PRegistry();

		const totalNodes = 2;

		context.node0 = await setup(0, p2pRegistry, crypto, prepareNodeValidators(validators, 0, totalNodes));
		context.node1 = await setup(1, p2pRegistry, crypto, prepareNodeValidators(validators, 1, totalNodes));

		await run(context.node0);
		await run(context.node1);
	});

	afterEach(async (context) => {
		await stop(context.node0);
		await stop(context.node1);
	});

	it("should create new block", async (context) => {
		await snoozeForBlock([context.node0, context.node1]);

		const commit = await getLastCommit(context.node0);

		await assertBockHeight([context.node0, context.node1], 1);
		await assertBlockId([context.node0, context.node1], commit.block.data.id);
		await assertCommitValidators([context.node0, context.node1], allValidators);
	});

	it("should create new block second time", async (context) => {
		await snoozeForBlock([context.node0, context.node1]);

		const commit = await getLastCommit(context.node0);

		await assertBockHeight([context.node0, context.node1], 1);
		await assertBlockId([context.node0, context.node1], commit.block.data.id);
		await assertCommitValidators([context.node0, context.node1], allValidators);
	});
});

import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight } from "./asserts";
import { P2PRegistry } from "./p2p";
import { run, setup, stop } from "./setup";
import { getLatestBlock, prepareNodeValidators, snoozeForBlock } from "./utils";

describe<{
	node0: Sandbox;
	node1: Sandbox;
}>("Consensus", ({ beforeEach, afterEach, it, assert }) => {
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

		const block = await getLatestBlock(context.node0);

		await assertBockHeight([context.node0, context.node1], 1);
		await assertBlockId([context.node0, context.node1], block!.data.id);
	});

	it("should create new block second time", async (context) => {
		await snoozeForBlock([context.node0, context.node1]);

		const block = await getLatestBlock(context.node0);

		await assertBockHeight([context.node0, context.node1], 1);
		await assertBlockId([context.node0, context.node1], block!.data.id);
	});
});

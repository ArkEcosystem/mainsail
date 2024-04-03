import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight } from "./asserts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import { getLastCommit, prepareNodeValidators, snoozeForBlock } from "./utils.js";

describe<{
	nodes: Sandbox[];
}>("Base", ({ beforeEach, afterEach, it }) => {
	beforeEach(async (context) => {
		const p2pRegistry = new P2PRegistry();

		const totalNodes = 2;

		context.nodes = [];

		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, p2pRegistry, crypto, prepareNodeValidators(validators, index, totalNodes)),
			);
		}

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);
		await runMany(context.nodes);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("should create new block", async ({ nodes }) => {
		await snoozeForBlock(nodes);

		const commit = await getLastCommit(nodes[0]);

		await assertBockHeight(nodes, 1);
		await assertBlockId(nodes, commit.block.data.id);
	});

	it("should create new block second time", async ({ nodes }) => {
		await snoozeForBlock(nodes);

		const commit = await getLastCommit(nodes[0]);

		await assertBockHeight(nodes, 1);
		await assertBlockId(nodes, commit.block.data.id);
	});
});

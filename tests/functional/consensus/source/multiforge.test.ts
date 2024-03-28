import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight, assertCommitValidators } from "./asserts.js";
import { P2PRegistry } from "./p2p.js";
import { run, setup, stop } from "./setup.js";
import { getLastCommit, prepareNodeValidators, snoozeForBlock } from "./utils.js";

describe<{
	nodes: Sandbox[];
}>("Consensus", ({ beforeEach, afterEach, it, assert }) => {
	const allValidators = new Array(validators.secrets.length).fill(true);

	beforeEach(async (context) => {
		const p2pRegistry = new P2PRegistry();

		const totalNodes = 3;

		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, p2pRegistry, crypto, prepareNodeValidators(validators, index, totalNodes)),
			);
		}

		for (const node of context.nodes) {
			await run(node);
		}
	});

	afterEach(async (context) => {
		for (const node of context.nodes) {
			await stop(node);
		}
	});

	it("#singleForge - should forge 3 blocks with all validators signing", async (context) => {
		await snoozeForBlock(context.nodes);

		const commit = await getLastCommit(context.nodes[0]);

		await assertBockHeight(context.nodes, 1);
		await assertBlockId(context.nodes, commit.block.data.id);
		await assertCommitValidators(context.nodes, allValidators);
	});
});

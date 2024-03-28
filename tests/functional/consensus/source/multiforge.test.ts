import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight, assertCommitValidators } from "./asserts.js";
import { P2PRegistry } from "./p2p.js";
import { run, setup, stop } from "./setup.js";
import { prepareNodeValidators, snoozeForBlock } from "./utils.js";

describe<{
	nodes: Sandbox[];
}>("Consensus", ({ beforeEach, afterEach, it, assert }) => {
	const allValidators = new Array(validators.secrets.length).fill(true);

	beforeEach(async (context) => {
		const p2pRegistry = new P2PRegistry();

		const totalNodes = 5;

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

		await assertBockHeight(context.nodes, 1);
		await assertBlockId(context.nodes);
		await assertCommitValidators(context.nodes, allValidators);

		await snoozeForBlock(context.nodes);

		await assertBockHeight(context.nodes, 2);
		await assertBlockId(context.nodes);
		await assertCommitValidators(context.nodes, allValidators);

		await snoozeForBlock(context.nodes);

		await assertBockHeight(context.nodes, 3);
		await assertBlockId(context.nodes);
		await assertCommitValidators(context.nodes, allValidators);
	});
});

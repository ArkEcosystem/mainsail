import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight, assertBockRound, assertCommitValidators } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import { getLastCommit, getValidators, prepareNodeValidators, snoozeForBlock } from "./utils.js";

describe<{
	nodes: Sandbox[];
	validators: Validator[];
}>("Consensus", ({ beforeEach, afterEach, it, assert, stub }) => {
	const allValidators = Array.from<boolean>({ length: validators.secrets.length }).fill(true);

	beforeEach(async (context) => {
		const p2pRegistry = new P2PRegistry();

		const totalNodes = 5;

		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, p2pRegistry, crypto, prepareNodeValidators(validators, index, totalNodes)),
			);
		}

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);

		context.validators = await getValidators(context.nodes[0], validators);

		await runMany(context.nodes);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("#single propose - should forge 3 blocks with all validators signing", async ({ nodes, validators }) => {
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
		await assertCommitValidators(nodes, allValidators);
		assert.equal((await getLastCommit(nodes[0])).block.data.generatorPublicKey, validators[0].publicKey);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
		await assertCommitValidators(nodes, allValidators);
		assert.equal((await getLastCommit(nodes[0])).block.data.generatorPublicKey, validators[0].publicKey);

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 3);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
		await assertCommitValidators(nodes, allValidators);
		assert.equal((await getLastCommit(nodes[0])).block.data.generatorPublicKey, validators[0].publicKey);
	});

	it("#missing propose - should increase round and forge on same height", async (context) => {});
});

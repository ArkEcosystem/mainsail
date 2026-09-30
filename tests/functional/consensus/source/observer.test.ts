import type { Contracts } from "@mainsail/contracts";

import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound } from "./asserts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import { prepareNodeValidators, snoozeForBlock } from "./utilities.js";

describe<{
	nodes: Contracts.Kernel.Application[];
	p2p: P2PRegistry;
}>("Observer", ({ beforeEach, afterEach, it, assert }) => {
	const totalValidatorNodes = 5;

	beforeEach(async (context) => {
		context.p2p = new P2PRegistry();

		context.nodes = [];
		for (let index = 0; index < totalValidatorNodes; index++) {
			context.nodes.push(
				await setup(index, context.p2p, crypto, prepareNodeValidators(validators, index, totalValidatorNodes)),
			);
		}

		// A full node without validator keys: it hears everything and signs nothing.
		context.nodes.push(await setup(totalValidatorNodes, context.p2p, crypto, { secrets: [] }));

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("should follow the chain from the gossip alone, without signing anything", async ({ nodes, p2p }) => {
		const blocks = 3;

		await runMany(nodes);
		await snoozeForBlock(nodes, blocks);

		// The observer holds the same chain as the validators...
		await assertBlockNumber(nodes, blocks);
		await assertBlockRound(nodes, blocks, 0);
		await assertBlockHash(nodes, blocks);

		// ...while only the five validators ever proposed or voted.
		for (let blockNumber = 1; blockNumber <= blocks; blockNumber++) {
			assert.equal(p2p.proposals.getMessages(blockNumber, 0).length, 1);
			assert.equal(p2p.prevotes.getMessages(blockNumber, 0).length, totalValidatorNodes);
			assert.equal(p2p.precommits.getMessages(blockNumber, 0).length, totalValidatorNodes);
		}
	});
});

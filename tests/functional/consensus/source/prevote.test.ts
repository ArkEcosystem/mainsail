import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { sleep } from "@mainsail/utils";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight, assertBockRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import { getLastCommit, getValidators, prepareNodeValidators, snoozeForBlock, snoozeForRound } from "./utils.js";

describe<{
	nodes: Sandbox[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Propose", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	beforeEach(async (context) => {
		context.p2p = new P2PRegistry();

		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, context.p2p, crypto, prepareNodeValidators(validators, index, totalNodes)),
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

	it("should confirm block, if < minority does not prevote", async ({ nodes, p2p }) => {
		const node0 = nodes[0];
		const stubPrevote = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");

		stubPrevote.callsFake(async () => {
			stubPrevote.restore();
		});

		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes - 1); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Next block
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
	});

	it("should not confirm block, if > minority does not prevote", async ({ nodes, p2p }) => {
		const node0 = nodes[0];
		const stubPrevote0 = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");
		stubPrevote0.callsFake(async () => {
			stubPrevote0.restore();
		});

		const node1 = nodes[1];
		const stubPrevote1 = stub(node1.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");
		stubPrevote1.callsFake(async () => {
			stubPrevote1.restore();
		});

		await sleep(500);

		assert.equal(p2p.precommits.getMessages(1, 0).length, 0);
	});
});

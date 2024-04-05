import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { sleep } from "@mainsail/utils";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight, assertBockRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getLastCommit,
	getValidators,
	makePrevote,
	makeProposal,
	prepareNodeValidators,
	snoozeForBlock,
} from "./utils.js";

describe<{
	nodes: Sandbox[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Precommit", ({ beforeEach, afterEach, it, assert, stub }) => {
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
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("should confirm block, if < minority does not precommit", async ({ nodes, p2p }) => {
		const node0 = nodes[0];
		const stubPrecommit = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");

		stubPrecommit.callsFake(async () => {
			stubPrecommit.restore();
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1); // Assert number of precommits

		// Next block
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
	});

	it("should not confirm block, if > minority does not precommit", async ({ nodes, p2p }) => {
		const node0 = nodes[0];
		const stubPrecommit0 = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit0.callsFake(async () => {
			stubPrecommit0.restore();
		});

		const node1 = nodes[1];
		const stubPrecommit1 = stub(node1.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit1.callsFake(async () => {
			stubPrecommit1.restore();
		});

		await runMany(nodes);
		await sleep(500);

		assert.equal(p2p.precommits.getMessages(1, 0).length, 3);
	});
});

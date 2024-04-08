import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";
import { sleep } from "@mainsail/utils";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { assertBlockId, assertBockHeight, assertBockRound, assertCommitRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getLastCommit,
	getValidators,
	makePrecommit,
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

	it("should confirm block, if < minority precommits null", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPrecommit = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		const precommit = await makePrecommit(node0, validators[0], 1, 0);

		stubPrecommit.callsFake(async () => {
			stubPrecommit.restore();
			await p2p.broadcastPrecommit(precommit);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes precommits
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((prevote) => prevote.blockId),
			[undefined, commit.block.data.id, commit.block.data.id, commit.block.data.id, commit.block.data.id],
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
	});

	it("should re-propose block, if one missed, malicious sends null", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPrecommit0 = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit0.callsFake(async () => {
			stubPrecommit0.restore();
		});

		const node1 = nodes[1];
		const stubPrecommit1 = stub(node1.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		const precommit1 = await makePrecommit(node1, validators[1], 1, 0);
		stubPrecommit1.callsFake(async () => {
			stubPrecommit1.restore();
			await p2p.broadcastPrecommit(precommit1);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0); // Block should be locker and re-proposed
		await assertCommitRound(nodes, 1);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1); // Assert number of precommits

		// Assert all nodes precommits
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((prevote) => prevote.blockId),
			[undefined, commit.block.data.id, commit.block.data.id, commit.block.data.id],
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
	});

	it("should re-propose block, if one missed, malicious sends random block id", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = nodes[0];
		const stubPrecommit0 = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit0.callsFake(async () => {
			stubPrecommit0.restore();
		});

		const proposal = await makeProposal(node0, validators[0], 1, 0);

		const node1 = nodes[1];
		const stubPrecommit1 = stub(node1.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		const precommit1 = await makePrecommit(node1, validators[1], 1, 0, proposal.block.block.data.id);
		stubPrecommit1.callsFake(async () => {
			stubPrecommit1.restore();
			await p2p.broadcastPrecommit(precommit1);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0); // Block should be locker and re-proposed
		await assertCommitRound(nodes, 1);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1); // Assert number of precommits

		// Assert all nodes precommits
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((prevote) => prevote.blockId),
			[proposal.block.block.data.id, commit.block.data.id, commit.block.data.id, commit.block.data.id],
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
	});

	it("should re-propose block, if one missed, malicious sends multiple random block ids", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = nodes[0];
		const stubPrecommit0 = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit0.callsFake(async () => {
			stubPrecommit0.restore();
		});

		const proposal0 = await makeProposal(node0, validators[0], 1, 0);
		const proposal1 = await makeProposal(node0, validators[0], 1, 0);
		const proposal2 = await makeProposal(node0, validators[0], 1, 0);
		const proposal3 = await makeProposal(node0, validators[0], 1, 0);
		const proposal4 = await makeProposal(node0, validators[0], 1, 0);

		const node1 = nodes[1];
		const stubPrecommit1 = stub(node1.app.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		const precommit0 = await makePrecommit(node1, validators[1], 1, 0, proposal0.block.block.data.id);
		const precommit1 = await makePrecommit(node1, validators[1], 1, 0, proposal1.block.block.data.id);
		const precommit2 = await makePrecommit(node1, validators[1], 1, 0, proposal2.block.block.data.id);
		const precommit3 = await makePrecommit(node1, validators[1], 1, 0, proposal3.block.block.data.id);
		const precommit4 = await makePrecommit(node1, validators[1], 1, 0, proposal4.block.block.data.id);
		stubPrecommit1.callsFake(async () => {
			stubPrecommit1.restore();
			await p2p.broadcastPrecommit(precommit0);
			await p2p.broadcastPrecommit(precommit1);
			await p2p.broadcastPrecommit(precommit2);
			await p2p.broadcastPrecommit(precommit3);
			await p2p.broadcastPrecommit(precommit4);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 1);
		await assertBockRound(nodes, 0); // Block should be locker and re-proposed
		await assertCommitRound(nodes, 1);
		await assertBlockId(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1 + 4); // Assert number of precommits

		// Assert all nodes precommits
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((prevote) => prevote.blockId),
			[
				proposal0.block.block.data.id,
				proposal1.block.block.data.id,
				proposal2.block.block.data.id,
				proposal3.block.block.data.id,
				proposal4.block.block.data.id,
				commit.block.data.id,
				commit.block.data.id,
				commit.block.data.id,
			],
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBockHeight(nodes, 2);
		await assertBockRound(nodes, 0);
		await assertBlockId(nodes);
	});
});

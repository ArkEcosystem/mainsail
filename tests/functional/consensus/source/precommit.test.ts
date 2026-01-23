import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { sleep } from "@mainsail/utils";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertCommitRound } from "./asserts.js";
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
} from "./utilities.js";
import type { Contracts } from "@mainsail/contracts";

describe<{
	nodes: Contracts.Kernel.Application[],
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
		const stubPrecommit = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "precommit");

		stubPrecommit.callsFake(async () => {
			stubPrecommit.restore();
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1); // Assert number of precommits

		// Next block
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
	});

	it("should not confirm block, if > minority does not precommit", async ({ nodes, p2p }) => {
		const node0 = nodes[0];
		const stubPrecommit0 = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit0.callsFake(async () => {
			stubPrecommit0.restore();
		});

		const node1 = nodes[1];
		const stubPrecommit1 = stub(node1.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit1.callsFake(async () => {
			stubPrecommit1.restore();
		});

		await runMany(nodes);
		await sleep(500);

		assert.equal(p2p.precommits.getMessages(1, 0).length, 3);
	});

	it("should confirm block, if < minority precommits null", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPrecommit = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		const precommit = await makePrecommit(node0, validators[0], 1, 0);

		stubPrecommit.callsFake(async () => {
			stubPrecommit.restore();
			await p2p.broadcastMessage(precommit);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes precommits
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.precommits
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[
				undefined,
				commit.block.data.hash,
				commit.block.data.hash,
				commit.block.data.hash,
				commit.block.data.hash,
			].sort(),
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
	});

	it("should re-propose block, if one missed, malicious sends null", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPrecommit0 = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit0.callsFake(async () => {
			stubPrecommit0.restore();
		});

		const node1 = nodes[1];
		const stubPrecommit1 = stub(node1.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		const precommit1 = await makePrecommit(node1, validators[1], 1, 0);
		stubPrecommit1.callsFake(async () => {
			stubPrecommit1.restore();
			await p2p.broadcastMessage(precommit1);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0); // Block should be locker and re-proposed
		await assertCommitRound(nodes, 1);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1); // Assert number of precommits

		// Assert all nodes precommits
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.precommits
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[undefined, commit.block.data.hash, commit.block.data.hash, commit.block.data.hash].sort(),
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
	});

	it("should re-propose block, if one missed, malicious sends random block id", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = nodes[0];
		const stubPrecommit0 = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit0.callsFake(async () => {
			stubPrecommit0.restore();
		});

		const proposal = await makeProposal(node0, validators[0], 1, 0, Date.now());

		const node1 = nodes[1];
		const stubPrecommit1 = stub(node1.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		const precommit1 = await makePrecommit(node1, validators[1], 1, 0, proposal.getData().block.data.hash);
		stubPrecommit1.callsFake(async () => {
			stubPrecommit1.restore();
			await p2p.broadcastMessage(precommit1);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0); // Block should be locker and re-proposed
		await assertCommitRound(nodes, 1);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1); // Assert number of precommits

		// Assert all nodes precommits
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.precommits
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[
				proposal.getData().block.data.hash,
				commit.block.data.hash,
				commit.block.data.hash,
				commit.block.data.hash,
			].sort(),
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
	});

	it("should re-propose block, if one missed, malicious sends multiple random block ids", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = nodes[0];
		const stubPrecommit0 = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		stubPrecommit0.callsFake(async () => {
			stubPrecommit0.restore();
		});

		const proposal0 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal1 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal2 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal3 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal4 = await makeProposal(node0, validators[0], 1, 0, Date.now());

		const node1 = nodes[1];
		const stubPrecommit1 = stub(node1.get<Consensus>(Identifiers.Consensus.Service), "precommit");
		const precommit0 = await makePrecommit(node1, validators[1], 1, 0, proposal0.getData().block.data.hash);
		const precommit1 = await makePrecommit(node1, validators[1], 1, 0, proposal1.getData().block.data.hash);
		const precommit2 = await makePrecommit(node1, validators[1], 1, 0, proposal2.getData().block.data.hash);
		const precommit3 = await makePrecommit(node1, validators[1], 1, 0, proposal3.getData().block.data.hash);
		const precommit4 = await makePrecommit(node1, validators[1], 1, 0, proposal4.getData().block.data.hash);
		stubPrecommit1.callsFake(async () => {
			stubPrecommit1.restore();
			await p2p.broadcastMessage(precommit0);
			await p2p.broadcastMessage(precommit1);
			await p2p.broadcastMessage(precommit2);
			await p2p.broadcastMessage(precommit3);
			await p2p.broadcastMessage(precommit4);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0); // Block should be locker and re-proposed
		await assertCommitRound(nodes, 1);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1 + 4); // Assert number of precommits

		// Assert all nodes precommits
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.precommits
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[
				proposal0.getData().block.data.hash,
				proposal1.getData().block.data.hash,
				proposal2.getData().block.data.hash,
				proposal3.getData().block.data.hash,
				proposal4.getData().block.data.hash,
				commit.block.data.hash,
				commit.block.data.hash,
				commit.block.data.hash,
			].sort(),
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
	});
});

import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Identifiers } from "@mainsail/constants";
import { describe, Sandbox } from "@mainsail/test-framework";
import { sleep } from "@mainsail/utils";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound } from "./asserts.js";
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
} from "./utilities.js";

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

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes - 1); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Next block
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
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

		await runMany(nodes);
		await sleep(500);

		assert.equal(p2p.precommits.getMessages(1, 0).length, 0);
	});

	it("should confirm block, if < minority prevote null", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPrevote = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");

		const prevote = await makePrevote(node0, validators[0], 1, 0);

		stubPrevote.callsFake(async () => {
			stubPrevote.restore();
			await p2p.broadcastMessage(prevote);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.prevotes
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

	it("should not confirm block, if > minority prevote null", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPrevote0 = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");
		const prevote0 = await makePrevote(node0, validators[0], 1, 0);

		stubPrevote0.callsFake(async () => {
			stubPrevote0.restore();
			await p2p.broadcastMessage(prevote0);
		});

		const node1 = nodes[1];
		const stubPrevote1 = stub(node1.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");
		const prevote1 = await makePrevote(node1, validators[1], 1, 0);

		stubPrevote1.callsFake(async () => {
			stubPrevote1.restore();
			await p2p.broadcastMessage(prevote1);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		const blockHash = p2p.prevotes.getMessages(1, 0)[3].blockHash;
		assert.defined(blockHash);
		assert.equal(
			p2p.prevotes
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[undefined, undefined, blockHash, blockHash, blockHash].sort(),
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
	});

	it("should confirm block, if < minority prevote random block", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPrevote = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");

		const proposal = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const prevote = await makePrevote(node0, validators[0], 1, 0, proposal.getData().block.data.hash);

		stubPrevote.callsFake(async () => {
			stubPrevote.restore();
			await p2p.broadcastMessage(prevote);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.prevotes
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[
				proposal.getData().block.data.hash,
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

	it("should not confirm block, if > minority prevote random block", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const node1 = nodes[1];

		const proposal = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const prevote0 = await makePrevote(node0, validators[0], 1, 0, proposal.getData().block.data.hash);
		const stubPrevote0 = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");
		stubPrevote0.callsFake(async () => {
			stubPrevote0.restore();
			await p2p.broadcastMessage(prevote0);
		});

		const prevote1 = await makePrevote(node1, validators[1], 1, 0, proposal.getData().block.data.hash);
		const stubPrevote1 = stub(node1.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");
		stubPrevote1.callsFake(async () => {
			stubPrevote1.restore();
			await p2p.broadcastMessage(prevote1);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		const blockHash = p2p.prevotes.getMessages(1, 0)[3].blockHash;
		assert.defined(blockHash);
		assert.equal(
			p2p.prevotes
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[
				proposal.getData().block.data.hash,
				proposal.getData().block.data.hash,
				blockHash,
				blockHash,
				blockHash,
			].sort(),
		);

		// Next block
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
	});

	it("should confirm block, if < minority prevote multiple random blocks", async ({ nodes, validators, p2p }) => {
		const node0 = nodes[0];
		const stubPrevote = stub(node0.app.get<Consensus>(Identifiers.Consensus.Service), "prevote");

		const proposal0 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal1 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal2 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal3 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal4 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const prevote0 = await makePrevote(node0, validators[0], 1, 0, proposal0.getData().block.data.hash);
		const prevote1 = await makePrevote(node0, validators[0], 1, 0, proposal1.getData().block.data.hash);
		const prevote2 = await makePrevote(node0, validators[0], 1, 0, proposal2.getData().block.data.hash);
		const prevote3 = await makePrevote(node0, validators[0], 1, 0, proposal3.getData().block.data.hash);
		const prevote4 = await makePrevote(node0, validators[0], 1, 0, proposal4.getData().block.data.hash);

		stubPrevote.callsFake(async () => {
			stubPrevote.restore();
			await p2p.broadcastMessage(prevote0);
			await p2p.broadcastMessage(prevote1);
			await p2p.broadcastMessage(prevote2);
			await p2p.broadcastMessage(prevote3);
			await p2p.broadcastMessage(prevote4);
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes + 4); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		const commit = await getLastCommit(nodes[0]);
		assert.equal(
			p2p.prevotes
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

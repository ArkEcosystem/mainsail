import type { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound } from "./asserts.js";
import type { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getLastCommit,
	getNodeForValidator,
	getValidatorsInSlotOrder,
	makeProposal,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeForRound,
	snoozeUntil,
} from "./utilities.js";
import { makeCustomProposal, makeTransactionBuilderContext } from "./custom-proposal.js";
import { EvmCalls } from "@mainsail/test-transaction-builders";

describe<{
	nodes: Contracts.Kernel.Application[];
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

		context.validators = await getValidatorsInSlotOrder(context.nodes[0], validators);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("should confirm 3 blocks in round 0 with every validator signing", async ({ nodes, validators }) => {
		await runMany(nodes);

		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 0);
		await assertBlockHash(nodes, 1);
		assert.equal((await getLastCommit(nodes[0])).block.proposer, validators[0].address);

		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
		await assertBlockHash(nodes, 2);
		assert.equal((await getLastCommit(nodes[0])).block.proposer, validators[0].address);

		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 3);
		await assertBlockRound(nodes, 3, 0);
		await assertBlockHash(nodes, 3);
		assert.equal((await getLastCommit(nodes[0])).block.proposer, validators[0].address);
	});

	it("should confirm the block in round 1, if the proposer misses round 0", async ({ nodes, validators }) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");

		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		await runMany(nodes);

		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 1);
		await assertBlockHash(nodes, 1);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
	});

	it("should confirm the block in round 4, if the proposer misses 3 rounds", async ({ nodes, validators }) => {
		const rounds = 3;
		const node0 = getNodeForValidator(nodes, validators[0]);
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");

		stubPropose.callsFake(async () => {});

		await runMany(nodes);

		await snoozeForRound(nodes, rounds);
		stubPropose.restore();

		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, rounds + 1); // +1 for accepted block
		await assertBlockHash(nodes, 1);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
	});

	it("should prevote null for a proposal from the wrong proposer, and confirm a block in round 1", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");

		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		await runMany(nodes);

		const proposal0 = await makeProposal(
			getNodeForValidator(nodes, validators[1]),
			validators[1],
			1,
			0,
			Date.now(),
		);
		await p2p.broadcastProposal(proposal0);

		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 1);
		await assertBlockHash(nodes, 1);

		await snoozeUntil(
			() =>
				p2p.prevotes.getMessages(1, 0).length === totalNodes &&
				p2p.precommits.getMessages(1, 0).length === totalNodes,
		);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockHash),
			Array.from({ length: totalNodes }).fill(undefined),
		);

		// Assert all nodes precommit (null)
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockHash),
			Array.from({ length: totalNodes }).fill(undefined),
		);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
	});

	it("should take the first of two proposals from the proposer", async ({ nodes, validators, p2p }) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		await runMany(nodes);

		const proposal0 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal1 = await makeProposal(node0, validators[0], 1, 0, Date.now());

		await p2p.broadcastProposal(proposal0);
		await p2p.broadcastProposal(proposal1);

		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 0);
		await assertBlockHash(nodes, 1, proposal0.getPayload().block.hash);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
			].sort(),
		);

		// Assert all nodes precommit
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockHash),
			Array.from({ length: totalNodes }).fill(proposal0.getPayload().block.hash),
		);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
	});

	it("should confirm a block only in round 1, if two proposals split the nodes 3 : 2", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		await runMany(nodes);

		const proposal0 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal1 = await makeProposal(node0, validators[0], 1, 0, Date.now());

		await p2p.broadcastProposal(proposal0, [0, 1, 2]);
		await p2p.broadcastProposal(proposal1, [3, 4]);

		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 1);
		await assertBlockHash(nodes, 1);

		await snoozeUntil(() => p2p.precommits.getMessages(1, 0).length === totalNodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				proposal1.getPayload().block.hash,
				proposal1.getPayload().block.hash,
				proposal0.getPayload().block.hash,
			].sort(),
		);

		// Assert all nodes precommit (null)
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockHash),
			Array.from({ length: totalNodes }).fill(undefined),
		);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
	});

	it("should confirm a block only in round 4, if two proposals split the nodes 3 : 2 for 3 rounds", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const rounds = 3;

		const node0 = getNodeForValidator(nodes, validators[0]);
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");
		stubPropose.callsFake(async () => {});

		await runMany(nodes);

		for (let round = 0; round < rounds; round++) {
			const proposal0 = await makeProposal(node0, validators[0], 1, round, Date.now());
			const proposal1 = await makeProposal(node0, validators[0], 1, round, Date.now());

			await p2p.broadcastProposal(proposal0, [0, 1, 2]);
			await p2p.broadcastProposal(proposal1, [3, 4]);

			await snoozeForRound(nodes, round);

			await snoozeUntil(() => p2p.precommits.getMessages(1, round).length === totalNodes);

			assert.equal(p2p.proposals.getMessages(1, round).length, 2); // Assert number of proposals
			assert.equal(p2p.prevotes.getMessages(1, round).length, totalNodes); // Assert number of prevotes
			assert.equal(p2p.precommits.getMessages(1, round).length, totalNodes); // Assert number of precommits

			// Assert all nodes prevote
			assert.equal(
				p2p.prevotes
					.getMessages(1, round)
					.map((prevote) => prevote.blockHash)
					.sort(),
				[
					proposal0.getPayload().block.hash,
					proposal0.getPayload().block.hash,
					proposal0.getPayload().block.hash,
					proposal1.getPayload().block.hash,
					proposal1.getPayload().block.hash,
				].sort(),
			);

			// Assert all nodes precommit (null)
			assert.equal(
				p2p.precommits.getMessages(1, round).map((precommit) => precommit.blockHash),
				Array.from({ length: totalNodes }).fill(undefined),
			);
		}

		stubPropose.restore();
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, rounds + 1); // +1 for accepted block
		await assertBlockHash(nodes, 1);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
	});

	it("should confirm the proposal that reached +2/3 of the nodes, if two proposals split them 4 : 1", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		await runMany(nodes);

		const proposal0 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal1 = await makeProposal(node0, validators[0], 1, 0, Date.now());

		await p2p.broadcastProposal(proposal0, [0, 1, 2, 3]);
		await p2p.broadcastProposal(proposal1, [4]);

		const nodesSubset = nodes.slice(0, 4);
		await snoozeForBlock(nodesSubset);

		await assertBlockNumber(nodesSubset, 1);
		await assertBlockRound(nodesSubset, 1, 0);
		await assertBlockHash(nodesSubset, 1);

		await snoozeUntil(() => p2p.precommits.getMessages(1, 0).length === totalNodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				proposal1.getPayload().block.hash,
			].sort(),
		);

		// The majority precommits the block; the partitioned node precommits nil.
		assert.equal(
			p2p.precommits
				.getMessages(1, 0)
				.map((precommit) => precommit.blockHash)
				.sort(),
			[
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				proposal0.getPayload().block.hash,
				undefined,
			].sort(),
		);

		// Download blocks
		await p2p.postCommit(nodes[4], await getLastCommit(nodes[0]));
		await snoozeForBlock([nodes[4]], 1);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
	});

	it("should confirm a block only in round 1, if every node receives a different proposal", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		await runMany(nodes);

		const proposal0 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal1 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal2 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal3 = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const proposal4 = await makeProposal(node0, validators[0], 1, 0, Date.now());

		await p2p.broadcastProposal(proposal0, [0]);
		await p2p.broadcastProposal(proposal1, [1]);
		await p2p.broadcastProposal(proposal2, [2]);
		await p2p.broadcastProposal(proposal3, [3]);
		await p2p.broadcastProposal(proposal4, [4]);

		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 1);
		await assertBlockHash(nodes, 1);

		await snoozeUntil(() => p2p.precommits.getMessages(1, 0).length === totalNodes);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 5); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes); // Assert number of precommits

		// Assert all nodes prevote
		assert.equal(
			p2p.prevotes
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[
				proposal0.getPayload().block.hash,
				proposal2.getPayload().block.hash,
				proposal4.getPayload().block.hash,
				proposal3.getPayload().block.hash,
				proposal1.getPayload().block.hash,
			].sort(),
		);

		// Assert all nodes precommit (null)
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockHash),
			Array.from({ length: totalNodes }).fill(undefined),
		);

		// // Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
	});

	it("should confirm a block carrying an EVM call", async ({ nodes, validators, p2p }) => {
		// The proposer builds no block of its own for round 0; the custom one below takes its place.
		const node0 = getNodeForValidator(nodes, validators[0]);
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal");
		stubPropose.callsFake(async () => {
			stubPropose.restore();
		});

		await runMany(nodes);

		// Built for block 1, round 0, once every node is up and reachable, and sent to all of them, the proposer
		// included, the way its own proposal would go out.
		const context = makeTransactionBuilderContext(node0, nodes, validators);
		const transactions: Contracts.Crypto.Transaction[] = [];
		for (let i = 0; i < 1; i++) {
			transactions.push(
				await EvmCalls.makeEvmCall(context, { nonceOffset: i, recipient: validators[0].address }),
			);
		}
		await p2p.broadcastProposal(await makeCustomProposal({ app: node0, validators }, transactions));

		// The custom block itself is confirmed in round 0, with its transaction. Checking block 2 alone would
		// not tell a rejected block 1 (re-proposed empty in round 1) from an accepted one.
		await snoozeForBlock(nodes);
		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 0);
		await assertBlockHash(nodes, 1);
		assert.equal((await getLastCommit(nodes[0])).block.transactionsCount, 1);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
	});
});

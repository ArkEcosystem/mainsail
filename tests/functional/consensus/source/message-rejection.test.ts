import type { Contracts } from "@mainsail/contracts";

import { Enums } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { randomBytes } from "crypto";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound } from "./asserts.js";
import type { Validator } from "./contracts.js";
import { skipProposalsBeforeRound } from "./faults.js";
import type { Message } from "./p2p.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getNodeForValidator,
	getSigner,
	getValidatorIndex,
	getValidatorsInSlotOrder,
	makePrevote,
	makeProposal,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeForRound,
	snoozeUntil,
} from "./utilities.js";

const { Invalid, Skipped } = Enums.Consensus.ProcessorResult;

describe<{
	nodes: Contracts.Kernel.Application[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Message rejection", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	// The outcome of `message` on every node, once all of them have processed it.
	const resultsOf = async (p2p: P2PRegistry, message: Message): Promise<Enums.Consensus.ProcessorResult[]> => {
		await snoozeUntil(() => p2p.results.get(message).length === totalNodes);

		return p2p.results.get(message);
	};

	const onEveryNode = (result: Enums.Consensus.ProcessorResult) => Array.from({ length: totalNodes }, () => result);

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

	// The forged messages below are sent the moment consensus runs, so that they reach every node ahead of the
	// genuine ones, the first of which is the proposal a block prepare time later, and cannot be mistaken for
	// duplicates of them.

	it("should reject a prevote signed by another validator than the one it names", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// Validator 1 signs a prevote in the name of validator 2.
		const node1 = getNodeForValidator(nodes, validators[1]);
		const forged = await getSigner(node1, validators[1]).prevote(
			getValidatorIndex(node1, validators[2]),
			1,
			0,
			undefined,
		);
		await runMany(nodes);
		await p2p.broadcastMessage(forged);

		assert.equal(await resultsOf(p2p, forged), onEveryNode(Invalid));

		// The forged prevote is not counted: the block is confirmed in round 0 on everybody's genuine votes.
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 0);
		await assertBlockHash(nodes, 1);
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes);
	});

	it("should reject a proposal signed by another validator than the proposer it names", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// Validator 1 signs a proposal in the name of the proposer.
		const node1 = getNodeForValidator(nodes, validators[1]);
		const block = (await makeProposal(node1, validators[1], 1, 0, Date.now())).getPayload().block;
		const forged = await getSigner(node1, validators[1]).propose(
			getValidatorIndex(node1, validators[0]),
			0,
			undefined,
			block,
		);
		await forged.deserializePayload();
		await runMany(nodes);
		await p2p.broadcastProposal(forged);

		assert.equal(await resultsOf(p2p, forged), onEveryNode(Invalid));

		// The forged proposal leaves no trace: the proposer's genuine one is confirmed in round 0.
		await snoozeForBlock(nodes);

		const [genuine] = p2p.proposals.getMessages(1, 0).filter((proposal) => proposal !== forged);
		assert.defined(genuine);
		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 0);
		await assertBlockHash(nodes, 1, genuine.blockHeader.hash);
	});

	it("should reject a proposal from a validator that is not the proposer of the round", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// Validator 1 proposes in its own name, in a round that is not its turn.
		const node1 = getNodeForValidator(nodes, validators[1]);
		const uninvited = await makeProposal(node1, validators[1], 1, 0, Date.now());
		await runMany(nodes);
		await p2p.broadcastProposal(uninvited);

		assert.equal(await resultsOf(p2p, uninvited), onEveryNode(Invalid));

		await snoozeForBlock(nodes);

		const [genuine] = p2p.proposals.getMessages(1, 0).filter((proposal) => proposal !== uninvited);
		assert.defined(genuine);
		assert.equal(p2p.proposals.getMessages(1, 0).length, 2); // Assert number of proposals
		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 0);
		await assertBlockHash(nodes, 1, genuine.blockHeader.hash);
	});

	it("should skip a proposal and a prevote for a round it has moved past", async ({ nodes, validators, p2p }) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const node1 = getNodeForValidator(nodes, validators[1]);

		// Round 0 fails for want of a proposal, and everybody moves on to round 1.
		skipProposalsBeforeRound(stub, node0, 1, () => {});

		await runMany(nodes);
		await snoozeForRound(nodes, 1);

		// Only now do a proposal and a prevote for round 0 arrive.
		const staleProposal = await makeProposal(node0, validators[0], 1, 0, Date.now());
		const stalePrevote = await getSigner(node1, validators[1]).prevote(
			getValidatorIndex(node1, validators[1]),
			1,
			0,
			randomBytes(32).toString("hex"),
		);
		await p2p.broadcastProposal(staleProposal);
		await p2p.broadcastMessage(stalePrevote);

		assert.equal(await resultsOf(p2p, staleProposal), onEveryNode(Skipped));
		assert.equal(await resultsOf(p2p, stalePrevote), onEveryNode(Skipped));

		// Round 1 goes on undisturbed.
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1, 1);
		await assertBlockHash(nodes, 1);
	});

	it("should skip a proposal and a prevote for a block it has already committed", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const node1 = getNodeForValidator(nodes, validators[1]);

		await runMany(nodes);
		await snoozeForBlock(nodes);

		// A proposer that fell behind still works on block 1 and proposes its block again for round 1, and a
		// validator repeats a vote for block 1. The network is at block 2 by now.
		const [proposal] = p2p.proposals.getMessages(1, 0);
		assert.defined(proposal);
		if (!proposal.isDataDeserialized) {
			await proposal.deserializePayload();
		}

		const staleProposal = await getSigner(node0, validators[0]).propose(
			getValidatorIndex(node0, validators[0]),
			1,
			undefined,
			proposal.getPayload().block,
		);
		await staleProposal.deserializePayload();
		const stalePrevote = await makePrevote(node1, validators[1], 1, 0);
		await p2p.broadcastProposal(staleProposal);
		await p2p.broadcastMessage(stalePrevote);

		assert.equal(await resultsOf(p2p, staleProposal), onEveryNode(Skipped));
		assert.equal(await resultsOf(p2p, stalePrevote), onEveryNode(Skipped));

		// Block 2 is confirmed as usual.
		await snoozeForBlock(nodes, 2);

		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 0);
		await assertBlockHash(nodes, 2);
	});
});

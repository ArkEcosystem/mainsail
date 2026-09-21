import type { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertCommitRound } from "./asserts.js";
import type { Validator } from "./contracts.js";
import { skipPrecommitInRound, skipPrevoteInRound } from "./faults.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, restart, runMany, setup, stopMany } from "./setup.js";
import {
	getNodeForValidator,
	getValidatorsInSlotOrder,
	makePrecommit,
	makePrevote,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeUntil,
} from "./utilities.js";

type Context = {
	nodes: Contracts.Kernel.Application[];
	validators: Validator[];
	p2p: P2PRegistry;
};

// A validator that signed at 1/0 and went down before the network decided must not sign the position again once
// it is back: the round state, rebuilt from the consensus store, already holds its signature. Without the store the
// node would start round 0 over at the propose step and sign it anew: a fresh block as proposer, null as voter.
//
// Each scenario freezes round 0 below +2/3 of the message type in question by holding back validators 3 and 4, so
// that no timeout is armed and the network waits for the restarted node; afterwards the held-back messages are
// delivered by hand, the way the message downloader would, and the round completes.
describe<Context>("DoubleSign", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	// The validators hosted by the node with this index. Inside a test `validators` is the slot-ordered list, so
	// this is the way back to the configuration.
	const nodeValidators = (nodeIndex: number) => prepareNodeValidators(validators, nodeIndex, totalNodes);

	// `validators` is in slot order, so a validator's position in it is its validator index in the messages. The
	// proposer is pinned to index 0 (proposer-calculator.ts).
	const proposerIndex = 0;
	const voterIndex = 1;
	const heldBackIndexes = [3, 4];

	// Without its store a restarted node starts round 0 over: as proposer it forges another block at the block
	// prepare timeout, as voter it prevotes null when the propose timeout runs out. Round 0 is frozen meanwhile, so
	// waiting out both timeouts and finding the same signatures as before is the proof that nothing was signed again.
	const letRound0TimeoutsPass = async ({ nodes }: Context): Promise<void> => {
		const { blockPrepareTime, stageTimeout } = nodes[0]
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone().timeouts;

		await new Promise((resolve) => setTimeout(resolve, blockPrepareTime + 2 * stageTimeout));
	};

	const restartValidator = async (
		{ nodes, validators, p2p }: Context,
		validatorIndex: number,
	): Promise<Consensus> => {
		const node = getNodeForValidator(nodes, validators[validatorIndex]);
		const nodeIndex = nodes.indexOf(node);

		nodes[nodeIndex] = await restart(node, nodeIndex, p2p, crypto, nodeValidators(nodeIndex));

		return nodes[nodeIndex].get<Consensus>(Identifiers.Consensus.Service);
	};

	const signaturesAt = (p2p: P2PRegistry, blockNumber: number, round: number, validatorIndex: number) => ({
		precommits: p2p.precommits
			.getMessagesByValidator(blockNumber, round, validatorIndex)
			.map((message) => message.blockHash),
		prevotes: p2p.prevotes
			.getMessagesByValidator(blockNumber, round, validatorIndex)
			.map((message) => message.blockHash),
	});

	const assertBlockConfirmedInRound0 = async ({ nodes, p2p }: Context, blockHash: string): Promise<void> => {
		await snoozeForBlock(nodes, 1);
		await assertBlockNumber(nodes, 1);
		await assertCommitRound(nodes, 1, 0);
		await assertBlockHash(nodes, 1, blockHash);

		assert.equal(p2p.proposals.getMessages(1, 0).length, 1);
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes);
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes);
	};

	const assertSignsNextBlock = async ({ nodes, p2p }: Context, validatorIndex: number): Promise<void> => {
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		assert.equal(signaturesAt(p2p, 2, 0, validatorIndex).prevotes.length, 1);
		assert.equal(signaturesAt(p2p, 2, 0, validatorIndex).precommits.length, 1);
	};

	beforeEach(async (context) => {
		context.p2p = new P2PRegistry();

		// Real consensus storage, so a node can be restarted mid-round.
		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, context.p2p, crypto, nodeValidators(index), { consensusStorage: true }),
			);
		}

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);

		context.validators = await getValidatorsInSlotOrder(context.nodes[0], validators);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("should not prevote again after a restart at the prevote step", async (context) => {
		const { nodes, validators, p2p } = context;

		// 3 of 5 prevotes: nobody reaches +2/3, round 0 waits. Validator 1 prevotes and goes down.
		for (const validatorIndex of heldBackIndexes) {
			skipPrevoteInRound(stub, getNodeForValidator(nodes, validators[validatorIndex]), 0);
		}

		await runMany(nodes);
		await snoozeUntil(() => p2p.prevotes.getMessages(1, 0).length === 3);

		const [proposal] = p2p.proposals.getMessages(1, 0);
		assert.defined(proposal);
		const blockHash = proposal.blockHeader.hash;
		assert.equal(signaturesAt(p2p, 1, 0, voterIndex), { precommits: [], prevotes: [blockHash] });

		const consensus = await restartValidator(context, voterIndex);

		// No second prevote: the round state came back with the one already cast.
		await letRound0TimeoutsPass(context);
		assert.equal(signaturesAt(p2p, 1, 0, voterIndex), { precommits: [], prevotes: [blockHash] });
		assert.equal(consensus.getRound(), 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);

		for (const validatorIndex of heldBackIndexes) {
			const node = getNodeForValidator(nodes, validators[validatorIndex]);
			await p2p.broadcastMessage(await makePrevote(node, validators[validatorIndex], 1, 0, blockHash));
		}

		// One prevote and one precommit of validator 1 at 1/0, both for the block; the precommit is cast after
		// the restart, from the restored proposal and prevotes.
		await assertBlockConfirmedInRound0(context, blockHash);
		assert.equal(signaturesAt(p2p, 1, 0, voterIndex), { precommits: [blockHash], prevotes: [blockHash] });

		await assertSignsNextBlock(context, voterIndex);
	});

	it("should not precommit again after a restart at the precommit step", async (context) => {
		const { nodes, validators, p2p } = context;

		// Everybody prevotes and locks, but with 3 of 5 precommits nobody reaches +2/3, round 0 waits. Validator 1
		// precommits and goes down.
		for (const validatorIndex of heldBackIndexes) {
			skipPrecommitInRound(stub, getNodeForValidator(nodes, validators[validatorIndex]), 0);
		}

		await runMany(nodes);
		await snoozeUntil(() => p2p.precommits.getMessages(1, 0).length === 3);

		const [proposal] = p2p.proposals.getMessages(1, 0);
		assert.defined(proposal);
		const blockHash = proposal.blockHeader.hash;
		assert.equal(signaturesAt(p2p, 1, 0, voterIndex), { precommits: [blockHash], prevotes: [blockHash] });

		// The lock comes back with the step, so the restored node neither prevotes nor precommits round 0 again.
		const consensus = await restartValidator(context, voterIndex);

		await letRound0TimeoutsPass(context);
		assert.equal(signaturesAt(p2p, 1, 0, voterIndex), { precommits: [blockHash], prevotes: [blockHash] });
		assert.equal(consensus.getRound(), 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Precommit);
		assert.equal(consensus.getLockedRound(), 0);

		for (const validatorIndex of heldBackIndexes) {
			const node = getNodeForValidator(nodes, validators[validatorIndex]);
			await p2p.broadcastMessage(await makePrecommit(node, validators[validatorIndex], 1, 0, blockHash));
		}

		await assertBlockConfirmedInRound0(context, blockHash);
		assert.equal(signaturesAt(p2p, 1, 0, voterIndex), { precommits: [blockHash], prevotes: [blockHash] });

		await assertSignsNextBlock(context, voterIndex);
	});

	it("should not propose again after a restart of the proposer", async (context) => {
		const { nodes, validators, p2p } = context;

		// 3 of 5 prevotes: round 0 waits. The proposer has proposed and prevoted its block and goes down.
		for (const validatorIndex of heldBackIndexes) {
			skipPrevoteInRound(stub, getNodeForValidator(nodes, validators[validatorIndex]), 0);
		}

		await runMany(nodes);
		await snoozeUntil(() => p2p.prevotes.getMessages(1, 0).length === 3);

		const [proposal] = p2p.proposals.getMessages(1, 0);
		assert.defined(proposal);
		assert.equal(proposal.validatorIndex, proposerIndex);
		const blockHash = proposal.blockHeader.hash;

		// The proposal comes back from the store: the round has one, so the proposer builds no other block for it.
		// Without the store it would forge a second block for 1/0.
		const consensus = await restartValidator(context, proposerIndex);

		await letRound0TimeoutsPass(context);
		assert.equal(p2p.proposals.getMessages(1, 0).length, 1);
		assert.equal(signaturesAt(p2p, 1, 0, proposerIndex), { precommits: [], prevotes: [blockHash] });
		assert.equal(consensus.getRound(), 0);
		assert.equal(consensus.getStep(), Enums.Consensus.Step.Prevote);

		for (const validatorIndex of heldBackIndexes) {
			const node = getNodeForValidator(nodes, validators[validatorIndex]);
			await p2p.broadcastMessage(await makePrevote(node, validators[validatorIndex], 1, 0, blockHash));
		}

		await assertBlockConfirmedInRound0(context, blockHash);
		assert.equal(signaturesAt(p2p, 1, 0, proposerIndex), { precommits: [blockHash], prevotes: [blockHash] });

		// The next block is proposed by the restarted proposer like any other.
		await assertSignsNextBlock(context, proposerIndex);
		assert.equal(
			p2p.proposals.getMessages(2, 0).map((nextProposal) => nextProposal.validatorIndex),
			[proposerIndex],
		);
	});
});

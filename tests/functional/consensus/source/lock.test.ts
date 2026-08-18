import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Enums, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { sleep } from "@mainsail/utils";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertCommitRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import { getValidators, makePrecommit, prepareNodeValidators, snoozeForBlock, snoozeForRound } from "./utilities.js";
import type { Contracts } from "@mainsail/contracts";

describe<{
	nodes: Contracts.Kernel.Application[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Lock", ({ beforeEach, afterEach, it, assert, stub }) => {
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

	// Makes a node ignore the prevotes of every other validator in a single round, so it never
	// reaches +2/3 there and therefore neither locks nor updates its valid value in that round.
	const ignoreForeignPrevotes = (
		node: Contracts.Kernel.Application,
		ownValidatorIndex: number,
		round: number,
		stubber: typeof stub,
	) => {
		const messageProcessor = node.get<Contracts.Consensus.MessageProcessor>(
			Identifiers.Consensus.Processor.Message,
		);
		const process = messageProcessor.process.bind(messageProcessor);

		stubber(messageProcessor, "process").callsFake(async (...arguments_: unknown[]) => {
			const message = arguments_[0] as Contracts.Crypto.Message;

			if (
				message.type === Enums.Crypto.MessageType.Prevote &&
				message.round === round &&
				message.validatorIndex !== ownValidatorIndex
			) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			return process(message, arguments_[1] as boolean | undefined);
		});
	};

	// Replaces a node's precommit with a null precommit while it is below `untilRound`, so the round
	// still gathers +2/3 precommits for *something* - which keeps rounds advancing - but never +2/3
	// for the block, so no commit happens and the lock survives into the next round.
	const precommitNullUntilRound = (
		node: Contracts.Kernel.Application,
		validator: Validator,
		untilRound: number,
		p2p: P2PRegistry,
		stubber: typeof stub,
	) => {
		const consensus = node.get<Consensus>(Identifiers.Consensus.Service);
		const precommit = consensus.precommit.bind(consensus);

		stubber(consensus, "precommit").callsFake(async (...arguments_: unknown[]) => {
			const round = consensus.getRound();

			if (round < untilRound) {
				await p2p.broadcastMessage(await makePrecommit(node, validator, 1, round));
				return;
			}

			await precommit(arguments_[0] as string | undefined);
		});
	};

	it("#onProposal - should prevote null for a fresh proposal, when locked on another block", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// Node 0 is the only proposer, since the harness pins the proposer index to 0. Make it drop
		// the other validators' round-0 prevotes so that it never locks: it then has no valid value
		// to re-propose and forges a *fresh* block in round 1, while nodes 1-4 are locked on round 0's.
		ignoreForeignPrevotes(nodes[0], 0, 0, stub);

		// 3 of 5 precommits for the round-0 block is below +2/3, so round 0 fails and the lock holds.
		precommitNullUntilRound(nodes[4], validators[4], 1, p2p, stub);

		await runMany(nodes);
		await snoozeForRound(nodes, 1);

		// Round 1 ends either way: honouring the lock it fails on null prevotes and round 2 starts,
		// ignoring the lock the conflicting block would reach +2/3 and commit instead.
		await Promise.race([snoozeForRound(nodes, 2), sleep(3000)]);

		const round0Proposal = p2p.proposals.getMessages(1, 0)[0];
		const round1Proposal = p2p.proposals.getMessages(1, 1)[0];
		assert.defined(round0Proposal);
		assert.defined(round1Proposal);

		// Round 1 really is a fresh proposal, for a different block.
		assert.undefined(round1Proposal.validRound);
		assert.not.equal(round1Proposal.blockHeader.hash, round0Proposal.blockHeader.hash);

		// The four locked nodes prevote null; only the unlocked proposer prevotes the new block.
		const round1Prevotes = p2p.prevotes.getMessages(1, 1);
		assert.equal(round1Prevotes.length, totalNodes);
		assert.equal(
			round1Prevotes.map((prevote) => prevote.blockHash).sort(),
			[round1Proposal.blockHeader.hash, undefined, undefined, undefined, undefined].sort(),
		);

		// The conflicting block is never committed - the chain is still on the genesis block.
		await assertBlockNumber(nodes, 0);
	});

	it("#onProposalLocked - should prevote the locked block, when the lock proof is older than the locked round", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// Node 0 proposes every round. Dropping the other validators' round-1 prevotes keeps its
		// valid value at round 0, so in round 2 it re-proposes the block with validRound 0 while
		// nodes 1-4 have re-locked that same block at round 1 - i.e. lockedRound > validRound.
		ignoreForeignPrevotes(nodes[0], 0, 1, stub);

		// Hold rounds 0 and 1 below the precommit majority so the chain reaches round 2.
		precommitNullUntilRound(nodes[3], validators[3], 2, p2p, stub);
		precommitNullUntilRound(nodes[4], validators[4], 2, p2p, stub);

		await runMany(nodes);

		const committed = await Promise.race([snoozeForBlock(nodes).then(() => true), sleep(10_000).then(() => false)]);

		// Fails when a locked validator refuses to prevote the very block it is locked on: the round
		// then dies on null prevotes and the proposer keeps re-proposing with the same older proof.
		assert.true(committed);

		// The very same block is proposed in every round, always proven by the round-0 prevotes.
		const round0Proposal = p2p.proposals.getMessages(1, 0)[0];
		for (const round of [1, 2]) {
			const proposal = p2p.proposals.getMessages(1, round)[0];
			assert.defined(proposal);
			assert.equal(proposal.validRound, 0);
			assert.equal(proposal.blockHeader.hash, round0Proposal.blockHeader.hash);
		}

		// Round 2: every node prevotes the block it is locked on, despite the older lock proof.
		const round2Prevotes = p2p.prevotes.getMessages(1, 2);
		assert.equal(round2Prevotes.length, totalNodes);
		for (const prevote of round2Prevotes) {
			assert.equal(prevote.blockHash, round0Proposal.blockHeader.hash);
		}

		// So the round-0 block commits in round 2.
		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertCommitRound(nodes, 2);
		await assertBlockHash(nodes, round0Proposal.blockHeader.hash);
	});
});

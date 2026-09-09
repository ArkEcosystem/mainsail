import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Enums, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertCommitRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getNodeForValidator,
	getValidatorsInSlotOrder,
	makePrecommit,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeUntil,
} from "./utilities.js";
import type { Contracts } from "@mainsail/contracts";

describe<{
	nodes: Contracts.Kernel.Application[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Lock", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	// The harness pins the proposer to slot 0 (proposer-calculator.ts), so validators[0] proposes every round.

	// Drops the other validators' prevotes of `round` on `node`, so it never sees +2/3 prevotes there and
	// neither locks nor updates its valid value in that round.
	const ignoreForeignPrevotes = (node: Contracts.Kernel.Application, validatorIndex: number, round: number) => {
		const messageProcessor = node.get<Contracts.Consensus.MessageProcessor>(
			Identifiers.Consensus.Processor.Message,
		);
		const process = messageProcessor.process.bind(messageProcessor);

		stub(messageProcessor, "process").callsFake(async (...arguments_: unknown[]) => {
			const message = arguments_[0] as Contracts.Crypto.Message;

			if (
				message.type === Enums.Crypto.MessageType.Prevote &&
				message.round === round &&
				message.validatorIndex !== validatorIndex
			) {
				return Enums.Consensus.ProcessorResult.Skipped;
			}

			return process(message, arguments_[1] as boolean | undefined);
		});
	};

	// Replaces the validator's precommits in `rounds` with null precommits, then restores the real precommit.
	// Those rounds still gather +2/3 precommits for something, so consensus moves on, but not +2/3 for the
	// block, so nothing commits and the locks survive into the next round.
	const precommitNullInRounds = (
		node: Contracts.Kernel.Application,
		validator: Validator,
		rounds: number[],
		p2p: P2PRegistry,
	) => {
		const consensus = node.get<Consensus>(Identifiers.Consensus.Service);
		const stubPrecommit = stub(consensus, "precommit");

		stubPrecommit.callsFake(async (...arguments_: unknown[]) => {
			const round = consensus.getRound();

			if (!rounds.includes(round)) {
				stubPrecommit.restore();
				await consensus.precommit(arguments_[0] as string | undefined);
				return;
			}

			await p2p.broadcastMessage(await makePrecommit(node, validator, 1, round));
		});
	};

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

	it("should prevote null for a fresh proposal, if locked on another block", async ({ nodes, validators, p2p }) => {
		// The proposer drops the others' round-0 prevotes, so it never locks and has no valid value to re-propose:
		// in round 1 it forges a fresh block, while the other nodes are locked on the round-0 block.
		ignoreForeignPrevotes(getNodeForValidator(nodes, validators[0]), 0, 0);

		// 3 of 5 precommits for the round-0 block is below +2/3, so round 0 fails and the locks hold.
		precommitNullInRounds(getNodeForValidator(nodes, validators[4]), validators[4], [0], p2p);

		await runMany(nodes);
		await snoozeUntil(() => p2p.precommits.getMessages(1, 1).length === totalNodes);

		const [round0Proposal] = p2p.proposals.getMessages(1, 0);
		const [round1Proposal] = p2p.proposals.getMessages(1, 1);
		assert.defined(round0Proposal);
		assert.defined(round1Proposal);

		// Round 0: the proposer sees only its own prevote, so it never precommits; node 4 precommits null by the stub.
		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes); // Assert number of prevotes
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes - 1); // Assert number of precommits
		assert.equal(
			p2p.precommits
				.getMessages(1, 0)
				.map((precommit) => precommit.blockHash)
				.sort(),
			[
				undefined,
				round0Proposal.blockHeader.hash,
				round0Proposal.blockHeader.hash,
				round0Proposal.blockHeader.hash,
			].sort(),
		);

		// Round 1: a fresh proposal for another block...
		assert.equal(p2p.proposals.getMessages(1, 1).length, 1); // Assert number of proposals
		assert.undefined(round1Proposal.validRound);
		assert.not.equal(round1Proposal.blockHeader.hash, round0Proposal.blockHeader.hash);

		// ...which only the unlocked proposer prevotes; the four locked nodes prevote null...
		assert.equal(p2p.prevotes.getMessages(1, 1).length, totalNodes); // Assert number of prevotes
		assert.equal(
			p2p.prevotes
				.getMessages(1, 1)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[round1Proposal.blockHeader.hash, undefined, undefined, undefined, undefined].sort(),
		);

		// ...so nobody precommits it and the conflicting block never commits.
		assert.equal(p2p.precommits.getMessages(1, 1).length, totalNodes); // Assert number of precommits
		assert.equal(
			p2p.precommits.getMessages(1, 1).map((precommit) => precommit.blockHash),
			[undefined, undefined, undefined, undefined, undefined],
		);
		await assertBlockNumber(nodes, 0);
	});

	it("should prevote the locked block, if the lock proof is older than the lock", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// The proposer drops the others' round-1 prevotes, so its valid value stays at round 0 and it keeps
		// re-proposing the block with validRound 0. The other nodes see +2/3 prevotes in round 1 and re-lock the
		// same block at round 1, so from round 2 on their lockedRound is higher than the validRound they receive.
		ignoreForeignPrevotes(getNodeForValidator(nodes, validators[0]), 0, 1);

		// Hold rounds 0 and 1 below +2/3 precommits for the block, so it can only commit in round 2.
		precommitNullInRounds(getNodeForValidator(nodes, validators[3]), validators[3], [0, 1], p2p);
		precommitNullInRounds(getNodeForValidator(nodes, validators[4]), validators[4], [0, 1], p2p);

		await runMany(nodes);
		await snoozeForBlock(nodes);
		await snoozeUntil(() => p2p.prevotes.getMessages(1, 2).length === totalNodes);

		const [round0Proposal] = p2p.proposals.getMessages(1, 0);
		assert.defined(round0Proposal);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0); // The round-0 block is re-proposed...
		await assertCommitRound(nodes, 2); // ...and committed in round 2
		await assertBlockHash(nodes, round0Proposal.blockHeader.hash);

		// Rounds 1 and 2 re-propose the same block, always proven by the round-0 prevotes.
		for (const round of [1, 2]) {
			const [proposal] = p2p.proposals.getMessages(1, round);
			assert.defined(proposal);

			assert.equal(p2p.proposals.getMessages(1, round).length, 1); // Assert number of proposals
			assert.equal(proposal.validRound, 0);
			assert.equal(proposal.blockHeader.hash, round0Proposal.blockHeader.hash);
		}

		// Every node prevotes the block in round 1, so the other nodes see +2/3 and re-lock it at round 1...
		assert.equal(
			p2p.prevotes.getMessages(1, 1).map((prevote) => prevote.blockHash),
			Array.from({ length: totalNodes }).fill(round0Proposal.blockHeader.hash),
		);

		// ...and still prevote it in round 2, where the proof (validRound 0) is older than their lock (round 1).
		assert.equal(
			p2p.prevotes.getMessages(1, 2).map((prevote) => prevote.blockHash),
			Array.from({ length: totalNodes }).fill(round0Proposal.blockHeader.hash),
		);
	});
});

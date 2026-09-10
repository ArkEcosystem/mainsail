import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import { Enums, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertCommitRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { ignoreForeignPrevotes, loseMessagesOn, precommitNullInRounds, skipPrevoteInRound } from "./faults.js";
import { Messages, P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, restart, runMany, setup, stopMany } from "./setup.js";
import {
	getNodeForValidator,
	getValidatorsInSlotOrder,
	makePrecommit,
	makeReProposal,
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

	// The validators hosted by the node with this index. Inside a test `validators` is the slot-ordered list, so
	// this is the way back to the configuration.
	const nodeValidators = (nodeIndex: number) => prepareNodeValidators(validators, nodeIndex, totalNodes);

	// The harness pins the proposer to slot 0 (proposer-calculator.ts), so validators[0] proposes every round.

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

	it("should prevote null for a fresh proposal, if locked on another block", async ({ nodes, validators, p2p }) => {
		// The proposer drops the others' round-0 prevotes, so it never locks and has no valid value to re-propose:
		// in round 1 it forges a fresh block, while the other nodes are locked on the round-0 block.
		ignoreForeignPrevotes(stub, getNodeForValidator(nodes, validators[0]), 0, 0);

		// 3 of 5 precommits for the round-0 block is below +2/3, so round 0 fails and the locks hold.
		precommitNullInRounds(stub, getNodeForValidator(nodes, validators[4]), validators[4], [0], p2p);

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

		// The lock does not expire with the round: round 2 brings yet another fresh block, and the four locked nodes
		// prevote null again.
		await snoozeUntil(() => p2p.prevotes.getMessages(1, 2).length === totalNodes);

		const [round2Proposal] = p2p.proposals.getMessages(1, 2);
		assert.defined(round2Proposal);
		assert.undefined(round2Proposal.validRound);
		assert.not.equal(round2Proposal.blockHeader.hash, round0Proposal.blockHeader.hash);
		assert.equal(
			p2p.prevotes
				.getMessages(1, 2)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[round2Proposal.blockHeader.hash, undefined, undefined, undefined, undefined].sort(),
		);
	});

	it("should prevote the locked block, if the lock proof is older than the lock", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// The proposer drops the others' round-1 prevotes, so its valid value stays at round 0 and it keeps
		// re-proposing the block with validRound 0. The other nodes see +2/3 prevotes in round 1 and re-lock the
		// same block at round 1, so from round 2 on their lockedRound is higher than the validRound they receive.
		ignoreForeignPrevotes(stub, getNodeForValidator(nodes, validators[0]), 0, 1);

		// Hold rounds 0 and 1 below +2/3 precommits for the block, so it can only commit in round 2.
		precommitNullInRounds(stub, getNodeForValidator(nodes, validators[3]), validators[3], [0, 1], p2p);
		precommitNullInRounds(stub, getNodeForValidator(nodes, validators[4]), validators[4], [0, 1], p2p);

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

	it("should prevote the re-proposed block, if the lock proof is newer than the lock", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// Every node locks the round-0 block. In round 1 the other nodes drop each other's prevotes, so only the
		// proposer sees the round-1 polka: it re-locks at round 1 and its valid value moves to round 1, while the
		// others stay locked at round 0. In round 2 it re-proposes the block with validRound 1, a proof newer than
		// the others' lock, which they have to accept.
		for (const index of [1, 2, 3, 4]) {
			ignoreForeignPrevotes(stub, getNodeForValidator(nodes, validators[index]), index, 1);
		}

		// Hold round 0 below +2/3 precommits for the block, so the locks survive into round 1.
		precommitNullInRounds(stub, getNodeForValidator(nodes, validators[3]), validators[3], [0], p2p);
		precommitNullInRounds(stub, getNodeForValidator(nodes, validators[4]), validators[4], [0], p2p);

		await runMany(nodes);

		// Seeing only their own prevote, the other nodes never time out of round 1 and never precommit; only the
		// proposer precommits the block. Null precommits on their behalf let round 1 reach +2/3 precommits and end.
		await snoozeUntil(
			() => p2p.prevotes.getMessages(1, 1).length === totalNodes && p2p.precommits.getMessages(1, 1).length === 1,
		);
		for (const index of [1, 2, 3, 4]) {
			const node = getNodeForValidator(nodes, validators[index]);
			await p2p.broadcastMessage(await makePrecommit(node, validators[index], 1, 1));
		}

		await snoozeForBlock(nodes);
		await snoozeUntil(() => p2p.prevotes.getMessages(1, 2).length === totalNodes);

		const [round0Proposal] = p2p.proposals.getMessages(1, 0);
		assert.defined(round0Proposal);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0); // The round-0 block is re-proposed...
		await assertCommitRound(nodes, 2); // ...and committed in round 2
		await assertBlockHash(nodes, round0Proposal.blockHeader.hash);

		// Round 1 re-proposes with the round-0 proof, round 2 with the round-1 proof.
		for (const [round, validRound] of [
			[1, 0],
			[2, 1],
		]) {
			const [proposal] = p2p.proposals.getMessages(1, round);
			assert.defined(proposal);

			assert.equal(p2p.proposals.getMessages(1, round).length, 1); // Assert number of proposals
			assert.equal(proposal.validRound, validRound);
			assert.equal(proposal.blockHeader.hash, round0Proposal.blockHeader.hash);
		}

		// Round 1: every node prevotes the block, but only the proposer sees the polka and precommits it.
		assert.equal(
			p2p.prevotes.getMessages(1, 1).map((prevote) => prevote.blockHash),
			Array.from({ length: totalNodes }).fill(round0Proposal.blockHeader.hash),
		);
		assert.equal(
			p2p.precommits
				.getMessages(1, 1)
				.map((precommit) => precommit.blockHash)
				.sort(),
			[round0Proposal.blockHeader.hash, undefined, undefined, undefined, undefined].sort(),
		);

		// Round 2: the nodes locked at round 0 accept the round-1 proof and prevote the block.
		assert.equal(
			p2p.prevotes.getMessages(1, 2).map((prevote) => prevote.blockHash),
			Array.from({ length: totalNodes }).fill(round0Proposal.blockHeader.hash),
		);
	});

	it("should keep the lock across a restart and prevote null for a fresh proposal", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// The proposer drops the others' round-0 prevotes, so it never locks and forges a fresh block in round 1,
		// while the other nodes are locked on the round-0 block.
		ignoreForeignPrevotes(stub, getNodeForValidator(nodes, validators[0]), 0, 0);

		// 3 of 5 precommits for the round-0 block is below +2/3, so round 0 fails and the locks hold.
		precommitNullInRounds(stub, getNodeForValidator(nodes, validators[4]), validators[4], [0], p2p);

		// Nodes 1 and 4 hold back their round-1 prevote. With 3 of 5 prevotes the round cannot end, so the network
		// waits in round 1 while node 1 restarts. Node 1 comes back on a new consensus instance, so the real prevote
		// it then casts is its only one for the round.
		const node1 = getNodeForValidator(nodes, validators[1]);
		skipPrevoteInRound(stub, node1, 1);
		skipPrevoteInRound(stub, getNodeForValidator(nodes, validators[4]), 1);

		await runMany(nodes);
		await snoozeUntil(() => p2p.proposals.getMessages(1, 1).length === 1);

		const [round0Proposal] = p2p.proposals.getMessages(1, 0);
		const [round1Proposal] = p2p.proposals.getMessages(1, 1);
		assert.defined(round0Proposal);
		assert.defined(round1Proposal);
		assert.undefined(round1Proposal.validRound);
		assert.not.equal(round1Proposal.blockHeader.hash, round0Proposal.blockHeader.hash);

		// Node 1 has processed the fresh proposal, so it moved to the prevote step, and the network is stuck one
		// prevote short.
		const consensusBeforeRestart = node1.get<Consensus>(Identifiers.Consensus.Service);
		await snoozeUntil(
			() =>
				consensusBeforeRestart.getRound() === 1 &&
				consensusBeforeRestart.getStep() === Enums.Consensus.Step.Prevote &&
				p2p.prevotes.getMessages(1, 1).length === 3,
		);

		const nodeIndex = nodes.indexOf(node1);
		const restarted = await restart(node1, nodeIndex, p2p, crypto, nodeValidators(nodeIndex));
		nodes[nodeIndex] = restarted;

		// The lock, the valid value and the pending round come back from consensus storage...
		const consensus = restarted.get<Consensus>(Identifiers.Consensus.Service);
		assert.equal(consensus.getLockedRound(), 0);
		assert.equal(consensus.getValidRound(), 0);

		// ...so the restarted node prevotes null for the fresh block, which is the prevote round 1 was waiting for.
		await snoozeUntil(() => p2p.prevotes.getMessages(1, 1).length === totalNodes - 1);
		assert.equal(
			p2p.prevotes.getMessagesByValidator(1, 1, 1).map((prevote) => prevote.blockHash),
			[undefined],
		);
		assert.equal(
			p2p.prevotes
				.getMessages(1, 1)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[round1Proposal.blockHeader.hash, undefined, undefined, undefined].sort(),
		);

		// Round 1 ends on null precommits and the conflicting block never commits.
		await snoozeUntil(() => p2p.precommits.getMessages(1, 1).length === totalNodes);
		assert.equal(
			p2p.precommits.getMessages(1, 1).map((precommit) => precommit.blockHash),
			[undefined, undefined, undefined, undefined, undefined],
		);
		await assertBlockNumber(nodes, 0);
	});

	it("should prevote null for a re-proposed block, if locked on another block in a round newer than the lock proof", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// Tendermint line 29, the refusing branch: a re-proposal of A with a proof from round 0 reaches nodes locked on
		// B since round 1. Their lock is newer than the proof and on another block, so they prevote null, while the
		// nodes without a lock prevote A. Validators are named by their index in the validator set; validator 0 is
		// the proposer, pinned by the harness.
		//
		// Round 0: the proposer forges A and validators 0-3 prevote it, but message loss keeps everybody from seeing
		// the polka: validator 4 misses the proposal and prevotes null, validators 0-3 each miss one prevote. Nobody
		// locks, the round ends on null precommits, and the network holds +2/3 prevotes for A.
		// Round 1: the proposer, without a valid value, forges B. Validators 0-2 see the polka and lock B; validator 3
		// misses one prevote and validator 4 the proposal, so they do not. Three precommits for B are below +2/3 and
		// the round ends.
		// Round 2: the harness pins the proposer, so the test sends what a rotating proposer with valid value A would
		// send: A again, validRound 0, proven by the round-0 prevotes.
		// Round 3: the proposer re-proposes its own valid value B, which no lock forbids.
		const nodeOfValidator = (validatorIndex: number) => getNodeForValidator(nodes, validators[validatorIndex]);
		const lossOfValidator = validators.map((validator) =>
			loseMessagesOn(stub, getNodeForValidator(nodes, validator)),
		);

		lossOfValidator[4].dropProposal(0);
		lossOfValidator[4].dropProposal(1);
		for (const validatorIndex of [0, 1, 2, 3]) {
			lossOfValidator[validatorIndex].dropPrevote(0, (validatorIndex + 1) % 4);
		}
		lossOfValidator[3].dropPrevote(1, 2);

		const proposerNode = nodeOfValidator(0);
		const proposerConsensus = proposerNode.get<Consensus>(Identifiers.Consensus.Service);
		const prepareProposal = proposerConsensus.prepareProposal.bind(proposerConsensus);
		const stubPrepare = stub(proposerConsensus, "prepareProposal");

		let lockedRoundsBeforeRound2: (number | undefined)[] = [];

		stubPrepare.callsFake(async (...arguments_: unknown[]) => {
			if (proposerConsensus.getRound() !== 2) {
				await prepareProposal(arguments_[0] as Contracts.Consensus.RoundState);
				return;
			}

			stubPrepare.restore();
			lockedRoundsBeforeRound2 = validators.map((validator) =>
				getNodeForValidator(nodes, validator).get<Consensus>(Identifiers.Consensus.Service).getLockedRound(),
			);

			void proposerNode
				.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal)
				.process(await makeReProposal(proposerNode, validators[0], p2p, 2, 0));
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		// The block hashes voted for in `round`, one list per validator, in validator order.
		const votesByValidator = (messages: Messages<Contracts.Crypto.Message>, round: number) =>
			validators.map((_, validatorIndex) =>
				messages.getMessagesByValidator(1, round, validatorIndex).map((message) => message.blockHash),
			);

		const [proposalA] = p2p.proposals.getMessages(1, 0);
		const [proposalB] = p2p.proposals.getMessages(1, 1);
		const [reProposalA] = p2p.proposals.getMessages(1, 2);
		const [reProposalB] = p2p.proposals.getMessages(1, 3);
		assert.defined(proposalA);
		assert.defined(proposalB);
		assert.defined(reProposalA);
		assert.defined(reProposalB);

		const hashA = proposalA.blockHeader.hash;
		const hashB = proposalB.blockHeader.hash;
		assert.not.equal(hashA, hashB);

		// Round 0: A, prevoted by validators 0-3 (the polka the network holds); nobody locks, everybody precommits
		// null.
		assert.equal(p2p.proposals.getMessages(1, 0).length, 1); // Assert number of proposals
		assert.undefined(proposalA.validRound);
		assert.equal(votesByValidator(p2p.prevotes, 0), [[hashA], [hashA], [hashA], [hashA], [undefined]]);
		assert.equal(votesByValidator(p2p.precommits, 0), [
			[undefined],
			[undefined],
			[undefined],
			[undefined],
			[undefined],
		]);

		// Round 1: a fresh B; validators 0-2 see the polka, lock and precommit it, validators 3 and 4 do not.
		assert.equal(p2p.proposals.getMessages(1, 1).length, 1); // Assert number of proposals
		assert.undefined(proposalB.validRound);
		assert.equal(votesByValidator(p2p.prevotes, 1), [[hashB], [hashB], [hashB], [hashB], [undefined]]);
		assert.equal(votesByValidator(p2p.precommits, 1), [[hashB], [hashB], [hashB], [undefined], [undefined]]);
		assert.equal(lockedRoundsBeforeRound2, [1, 1, 1, undefined, undefined]);

		// Round 2: A comes back with the round-0 proof. For validators 0-2 the lock (round 1) is newer than the proof
		// (round 0) and on another block, so they prevote null. Validators 3 and 4, unlocked, prevote A.
		assert.equal(p2p.proposals.getMessages(1, 2).length, 1); // Assert number of proposals
		assert.equal(reProposalA.blockHeader.hash, hashA);
		assert.equal(reProposalA.validRound, 0);
		assert.equal(votesByValidator(p2p.prevotes, 2), [[undefined], [undefined], [undefined], [hashA], [hashA]]);
		assert.equal(votesByValidator(p2p.precommits, 2), [
			[undefined],
			[undefined],
			[undefined],
			[undefined],
			[undefined],
		]);

		// Round 3: the proposer re-proposes its valid value B with the round-1 proof, and everybody prevotes it.
		assert.equal(p2p.proposals.getMessages(1, 3).length, 1); // Assert number of proposals
		assert.equal(reProposalB.blockHeader.hash, hashB);
		assert.equal(reProposalB.validRound, 1);
		assert.equal(votesByValidator(p2p.prevotes, 3), [[hashB], [hashB], [hashB], [hashB], [hashB]]);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1); // B was forged in round 1...
		await assertCommitRound(nodes, 3); // ...and committed in round 3
		await assertBlockHash(nodes, hashB);
	});
});

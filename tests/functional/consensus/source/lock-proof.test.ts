import type { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertCommitRound } from "./asserts.js";
import type { Validator } from "./contracts.js";
import { precommitNullInRounds } from "./faults.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getNodeForValidator,
	getSigner,
	getValidatorIndex,
	getValidatorsInSlotOrder,
	makeLockProof,
	makeProposal,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeUntil,
} from "./utilities.js";

type Node = Contracts.Kernel.Application;

// What the crafting of a bad re-proposal has to work with: the proposer node, the block A of round 0, and the
// genuine lock proof for it from round 0.
type Craft = (context: {
	node0: Node;
	validators: Validator[];
	blockA: Contracts.Crypto.Block;
	proofA: Contracts.Crypto.AggregatedSignature;
}) => Promise<Contracts.Crypto.Proposal>;

type Dataset = {
	// The round the bad re-proposal is sent in, and the validRound it claims.
	round: number;
	validRound: number;
	craft: Craft;
	toString: () => string;
};

const dataset = (name: string, round: number, validRound: number, craft: Craft): Dataset => ({
	craft,
	round,
	toString: () => name,
	validRound,
});

// A re-proposal signed by the proposer, with whatever block and proof the test hands it.
const reProposal = (
	node0: Node,
	proposer: Validator,
	round: number,
	validRound: number,
	block: Contracts.Crypto.Block,
	lockProof: Contracts.Crypto.AggregatedSignature,
) => getSigner(node0, proposer).propose(getValidatorIndex(node0, proposer), round, validRound, block, lockProof);

describe<{
	nodes: Node[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Lock proof", ({ beforeEach, afterEach, each, assert, stub }) => {
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

	// Round 0 gives the network a polka for block A, which every node locks, but only 3 of 5 precommits, so the
	// round fails and A is up for re-proposal. In the target round the proposer sends a re-proposal whose lock
	// proof does not hold up (the rounds in between, if any, pass without a proposal). Nobody may prevote it: a
	// proof that does not verify leaves the block unproven, and Tendermint line 28 asks for +2/3 prevotes of
	// validRound before a re-proposal counts. The round ends on null, and the honest re-proposal of A in the
	// next round is confirmed.
	each(
		"should prevote null for a re-proposal with %s, and confirm the honest re-proposal in the next round",
		async ({ context: { nodes, validators, p2p }, dataset }) => {
			const node0 = getNodeForValidator(nodes, validators[0]);
			const consensus = node0.get<Consensus>(Identifiers.Consensus.Service);

			for (const index of [3, 4]) {
				precommitNullInRounds(stub, getNodeForValidator(nodes, validators[index]), validators[index], [0], p2p);
			}

			const prepareProposal = consensus.prepareProposal.bind(consensus);
			const stubPrepare = stub(consensus, "prepareProposal");

			stubPrepare.callsFake(async (...arguments_: unknown[]) => {
				const round = consensus.getRound();

				if (round === 0) {
					await prepareProposal(arguments_[0] as Contracts.Consensus.RoundState);
					return;
				}

				if (round < dataset.round) {
					// The proposer fails to build a block, the round ends on null.
					return;
				}

				if (round > dataset.round) {
					stubPrepare.restore();
					await prepareProposal(arguments_[0] as Contracts.Consensus.RoundState);
					return;
				}

				const [proposalA] = p2p.proposals.getMessages(1, 0);
				if (!proposalA.isDataDeserialized) {
					await proposalA.deserializePayload();
				}
				const blockA = proposalA.getPayload().block;

				void node0.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal).process(
					await dataset.craft({
						blockA,
						node0,
						proofA: await makeLockProof(node0, p2p, 0, blockA.hash),
						validators,
					}),
				);
			});

			await runMany(nodes);
			await snoozeForBlock(nodes);
			await snoozeUntil(() => p2p.precommits.getMessages(1, dataset.round).length === totalNodes);

			const [proposalA] = p2p.proposals.getMessages(1, 0);
			const [badReProposal] = p2p.proposals.getMessages(1, dataset.round);
			const [honestReProposal] = p2p.proposals.getMessages(1, dataset.round + 1);
			assert.defined(proposalA);
			assert.defined(badReProposal);
			assert.defined(honestReProposal);

			// Round 0: A gets the polka, but 3 precommits are below +2/3.
			assert.equal(
				p2p.prevotes.getMessages(1, 0).map((prevote) => prevote.blockHash),
				Array.from({ length: totalNodes }).fill(proposalA.blockHeader.hash),
			);
			assert.equal(
				p2p.precommits
					.getMessages(1, 0)
					.map((precommit) => precommit.blockHash)
					.sort(),
				[
					proposalA.blockHeader.hash,
					proposalA.blockHeader.hash,
					proposalA.blockHeader.hash,
					undefined,
					undefined,
				].sort(),
			);

			// The target round: one re-proposal with the claimed validRound, and nothing but null votes.
			assert.equal(p2p.proposals.getMessages(1, dataset.round).length, 1); // Assert number of proposals
			assert.equal(badReProposal.validRound, dataset.validRound);
			assert.defined(badReProposal.lockProof);
			assert.equal(
				p2p.prevotes.getMessages(1, dataset.round).map((prevote) => prevote.blockHash),
				Array.from({ length: totalNodes }).fill(undefined),
			);
			assert.equal(
				p2p.precommits.getMessages(1, dataset.round).map((precommit) => precommit.blockHash),
				Array.from({ length: totalNodes }).fill(undefined),
			);

			// The next round: the proposer re-proposes A with the genuine round-0 proof, and everybody prevotes it.
			assert.equal(honestReProposal.blockHeader.hash, proposalA.blockHeader.hash);
			assert.equal(honestReProposal.validRound, 0);
			assert.equal(
				p2p.prevotes.getMessages(1, dataset.round + 1).map((prevote) => prevote.blockHash),
				Array.from({ length: totalNodes }).fill(proposalA.blockHeader.hash),
			);

			await assertBlockNumber(nodes, 1);
			await assertBlockRound(nodes, 0); // A was forged in round 0...
			await assertCommitRound(nodes, dataset.round + 1); // ...and committed in the round after the bad one
			await assertBlockHash(nodes, proposalA.blockHeader.hash);
		},
		[
			dataset(
				"a proof that names other signers than the ones that signed",
				1,
				0,
				async ({ node0, validators, blockA, proofA }) => {
					const signers = [...proofA.validators];
					signers[signers.indexOf(true)] = false;

					return reProposal(node0, validators[0], 1, 0, blockA, { ...proofA, validators: signers });
				},
			),
			dataset("a proof for another block than the one proposed", 1, 0, async ({ node0, validators, proofA }) => {
				// A fresh block, smuggled in under the polka of A.
				const blockB = (await makeProposal(node0, validators[0], 1, 1, Date.now())).getPayload().block;

				return reProposal(node0, validators[0], 1, 0, blockB, proofA);
			}),
			dataset(
				"a proof from another round than the validRound it claims",
				2,
				1,
				async ({ node0, validators, blockA, proofA }) => reProposal(node0, validators[0], 2, 1, blockA, proofA),
			),
			dataset("a validRound that is not before the round", 1, 1, async ({ node0, validators, blockA, proofA }) =>
				reProposal(node0, validators[0], 1, 1, blockA, proofA),
			),
		],
	);
});

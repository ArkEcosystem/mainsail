import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertCommitRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getLastCommit,
	getNodeForValidator,
	getValidatorIndex,
	getValidatorsInSlotOrder,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeUntil,
} from "./utilities.js";

describe<{
	nodes: Contracts.Kernel.Application[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Late proposal", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	// Holds the proposal for block 1, round 0 back on `node` until `release` resolves, then processes it as usual.
	// Every peer re-broadcasts a proposal it accepts, so several copies reach the node; all of them wait for the
	// same release, and the real processor then skips the duplicates.
	const holdProposal = (node: Contracts.Kernel.Application, release: () => Promise<void>) => {
		const proposalProcessor = node.get<Contracts.Consensus.ProposalProcessor>(
			Identifiers.Consensus.Processor.Proposal,
		);
		const process = proposalProcessor.process.bind(proposalProcessor);
		const stubProcess = stub(proposalProcessor, "process");

		let released: Promise<void> | undefined;

		stubProcess.callsFake(async (...arguments_: unknown[]) => {
			const proposal = arguments_[0] as Contracts.Crypto.Proposal;

			if (proposal.blockHeader.number === 1 && proposal.round === 0) {
				released ??= release().then(() => stubProcess.restore());
				await released;
			}

			return process(proposal, arguments_[1] as boolean | undefined);
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

	it("should confirm the block when the proposal arrives after +2/3 precommits for it", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node4 = getNodeForValidator(nodes, validators[4]);
		const roundState = () =>
			node4
				.get<Contracts.Consensus.RoundStateRepository>(Identifiers.Consensus.RoundStateRepository)
				.getRoundState(1, 0);

		// Node 4 sees the proposal only once the rest of the network has decided on the block.
		let precommitsBeforeProposal = 0;
		holdProposal(node4, async () => {
			await snoozeUntil(() => roundState().hasMajorityPrecommitsWithoutProposal());
			precommitsBeforeProposal = roundState().getPrecommits().length;
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		// The harness has no block downloader, so node 4 confirmed the block from the late proposal and the
		// precommits it already held.
		assert.equal(precommitsBeforeProposal, totalNodes - 1);
		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertCommitRound(nodes, 0);
		await assertBlockHash(nodes);

		// Node 4 still cast its own votes for the block, late.
		const blockHash = (await getLastCommit(node4)).block.hash;
		const validatorIndex = getValidatorIndex(node4, validators[4]);
		assert.equal(
			p2p.prevotes.getMessagesByValidator(1, 0, validatorIndex).map((prevote) => prevote.blockHash),
			[blockHash],
		);
		assert.equal(
			p2p.precommits.getMessagesByValidator(1, 0, validatorIndex).map((precommit) => precommit.blockHash),
			[blockHash],
		);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
	});

	it("should lock and precommit the block on +2/3 prevotes for it, even after prevoting nil on the propose timeout", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node4 = getNodeForValidator(nodes, validators[4]);
		const consensus = node4.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);

		// The propose timeout of node 4 expires just before the proposal arrives: it prevotes nil and moves on
		// to the prevote step.
		let stepBeforeProposal: Contracts.Consensus.Step | undefined;
		holdProposal(node4, async () => {
			await consensus.onTimeoutPropose(1, 0);
			stepBeforeProposal = consensus.getStep();
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		assert.equal(stepBeforeProposal, Enums.Consensus.Step.Prevote);

		const blockHash = (await getLastCommit(node4)).block.hash;
		const validatorIndex = getValidatorIndex(node4, validators[4]);

		// Node 4 prevoted nil, the others the block...
		assert.equal(
			p2p.prevotes.getMessagesByValidator(1, 0, validatorIndex).map((prevote) => prevote.blockHash),
			[undefined],
		);
		assert.equal(
			p2p.prevotes
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[blockHash, blockHash, blockHash, blockHash, undefined].sort(),
		);

		// ...but +2/3 prevotes for a block it holds still lock it (Tendermint line 36, step >= prevote): node 4
		// precommits the block with everybody else, and the block is confirmed in round 0.
		assert.equal(
			p2p.precommits.getMessages(1, 0).map((precommit) => precommit.blockHash),
			Array.from({ length: totalNodes }).fill(blockHash),
		);
		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertCommitRound(nodes, 0);
		await assertBlockHash(nodes);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
	});
});

import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertCommitRound } from "./asserts.js";
import type { Validator } from "./contracts.js";
import { holdProposal } from "./faults.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getCommits,
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
		holdProposal(stub, node4, async () => {
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
		holdProposal(stub, node4, async () => {
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

	it("should still confirm the block after precommitting nil, when the proposal arrives with +2/3 votes for it", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node4 = getNodeForValidator(nodes, validators[4]);
		const consensus = node4.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);

		// Both timeouts of node 4 expire before the proposal arrives: it prevotes nil, precommits nil, and is in the
		// precommit step when the proposal finally comes.
		let stepBeforeProposal: Contracts.Consensus.Step | undefined;
		holdProposal(stub, node4, async () => {
			await consensus.onTimeoutPropose(1, 0);
			await consensus.onTimeoutPrevote(1, 0);
			stepBeforeProposal = consensus.getStep();
		});

		await runMany(nodes);
		await snoozeForBlock(nodes);

		assert.equal(stepBeforeProposal, Enums.Consensus.Step.Precommit);

		const blockHash = (await getLastCommit(node4)).block.hash;
		const validatorIndex = getValidatorIndex(node4, validators[4]);

		// Node 4 voted nil twice, the others for the block...
		assert.equal(
			p2p.prevotes.getMessagesByValidator(1, 0, validatorIndex).map((prevote) => prevote.blockHash),
			[undefined],
		);
		assert.equal(
			p2p.precommits.getMessagesByValidator(1, 0, validatorIndex).map((precommit) => precommit.blockHash),
			[undefined],
		);
		assert.equal(
			p2p.prevotes
				.getMessages(1, 0)
				.map((prevote) => prevote.blockHash)
				.sort(),
			[blockHash, blockHash, blockHash, blockHash, undefined].sort(),
		);
		assert.equal(
			p2p.precommits
				.getMessages(1, 0)
				.map((precommit) => precommit.blockHash)
				.sort(),
			[blockHash, blockHash, blockHash, blockHash, undefined].sort(),
		);

		// ...yet with the proposal and +2/3 precommits for it in hand, node 4 confirms the block with everybody
		// else (Tendermint line 49): its own nil votes do not stand in the way of the decision.
		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertCommitRound(nodes, 0);
		await assertBlockHash(nodes);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
	});

	it("should drop a proposal for a round it has already left, and take the block from the commit instead", async ({
		nodes,
		validators,
	}) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const node4 = getNodeForValidator(nodes, validators[4]);
		const others = nodes.filter((node) => node !== node4);
		const consensus = node4.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);

		// The +2/3 precommits of the others start the precommit timeout on node 4, which moves it on to round 1.
		// Only then does the proposal for round 0 arrive.
		let roundBeforeProposal: number | undefined;
		const held = holdProposal(stub, node4, async () => {
			await snoozeUntil(() => consensus.getRound() >= 1);
			roundBeforeProposal = consensus.getRound();
		});

		await runMany(nodes);
		await snoozeForBlock(others);
		await snoozeUntil(() => held.results.length > 0);

		assert.equal(roundBeforeProposal, 1);

		// Every copy of the proposal is skipped: round 0 is over for node 4, so the block never reaches its round
		// state and node 4 stays behind, while the others confirmed the block in round 0 and moved on.
		assert.true(held.results.every((result) => result === Enums.Consensus.ProcessorResult.Skipped));
		assert.false(
			node4
				.get<Contracts.Consensus.RoundStateRepository>(Identifiers.Consensus.RoundStateRepository)
				.getRoundState(1, 0)
				.hasProposal(),
		);
		await assertBlockNumber([node4], 0);
		assert.equal(consensus.getBlockNumber(), 1);

		const [commit] = await getCommits(node0, 1, 1);
		assert.defined(commit);
		assert.equal(commit.proof.round, 0);

		// The commit of the others is the way back, as the block downloader would deliver it: node 4 applies it
		// and holds the same block 1.
		assert.equal(
			await node4
				.get<Contracts.Consensus.CommitProcessor>(Identifiers.Consensus.Processor.Commit)
				.process(commit),
			Enums.Consensus.ProcessorResult.Accepted,
		);
		await assertBlockNumber([node4], 1);
		await assertBlockHash([node4], commit.block.hash);
	});
});

import { Consensus } from "@mainsail/consensus/distribution/consensus.js";
import type { Contracts } from "@mainsail/contracts";
import { Enums, Identifiers } from "@mainsail/constants";
import * as Exceptions from "@mainsail/exceptions";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertInvalidBlock } from "./asserts.js";
import { Validator } from "./contracts.js";
import { makeCustomProposal } from "./custom-proposal.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getCommits,
	getLastBlockNumber,
	getLastCommit,
	getNodeForValidator,
	getValidatorIndex,
	getValidatorsInSlotOrder,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeForInvalidBlock,
	snoozeForRound,
} from "./utilities.js";

const { Accepted, Invalid, Skipped } = Enums.Consensus.ProcessorResult;

describe<{
	nodes: Contracts.Kernel.Application[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Commit", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	// Cuts `node` off from the network: every proposal and message reaching its processors is dropped, its own
	// votes included, so it neither hears nor says anything. Returns the function that reconnects it.
	const disconnect = (node: Contracts.Kernel.Application): (() => void) => {
		const stubs = [
			stub(
				node.get<Contracts.Consensus.ProposalProcessor>(Identifiers.Consensus.Processor.Proposal),
				"process",
			).resolvedValue(Skipped),
			stub(
				node.get<Contracts.Consensus.MessageProcessor>(Identifiers.Consensus.Processor.Message),
				"process",
			).resolvedValue(Skipped),
		];

		return () => {
			for (const stubbed of stubs) {
				stubbed.restore();
			}
		};
	};

	const commitProcessorOf = (node: Contracts.Kernel.Application) =>
		node.get<Contracts.Consensus.CommitProcessor>(Identifiers.Consensus.Processor.Commit);

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

	it("should catch up on the blocks it missed from their commits, and take part again", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const node4 = getNodeForValidator(nodes, validators[4]);
		const others = nodes.filter((node) => node !== node4);

		// Node 4 is cut off while the others forge three blocks without it.
		const reconnect = disconnect(node4);

		await runMany(nodes);
		await snoozeForBlock(others, 3);
		await assertBlockNumber(others, 3);
		await assertBlockNumber([node4], 0);

		// Hold the chain still, so that node 4 has a fixed target: the proposer stops proposing, and the others
		// run into rounds without a proposal.
		const stubPropose = stub(node0.get<Consensus>(Identifiers.Consensus.Service), "prepareProposal").resolvedValue(
			undefined,
		);
		await snoozeForRound(others, 1);

		const target = await getLastBlockNumber(node0);
		assert.true(target >= 3);

		// Back online, node 4 gets the commits it missed one at a time, as the block downloader delivers them...
		reconnect();

		for (const commit of await getCommits(node0, 1, target)) {
			assert.equal(await commitProcessorOf(node4).process(commit), Accepted);
		}

		// ...and holds the same chain as the others.
		await assertBlockNumber(nodes, target);
		await assertBlockHash(nodes);

		// The proposer proposes again: node 4 catches the round the others are in and confirms the next block
		// with them, then votes in round 0 of the block after like everybody else.
		stubPropose.restore();

		await snoozeForBlock(nodes, target + 1);
		await assertBlockNumber(nodes, target + 1);
		await assertBlockHash(nodes);

		await snoozeForBlock(nodes, target + 2);
		await assertBlockNumber(nodes, target + 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);

		const blockHash = (await getLastCommit(node0)).block.hash;
		const validatorIndex = getValidatorIndex(node4, validators[4]);
		assert.equal(p2p.prevotes.getMessages(target + 2, 0).length, totalNodes);
		assert.equal(p2p.precommits.getMessages(target + 2, 0).length, totalNodes);
		assert.equal(
			p2p.precommits
				.getMessagesByValidator(target + 2, 0, validatorIndex)
				.map((precommit) => precommit.blockHash),
			[blockHash],
		);
	});

	it("should apply a commit only for the block it expects next", async ({ nodes, validators }) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const node4 = getNodeForValidator(nodes, validators[4]);
		const others = nodes.filter((node) => node !== node4);

		// Node 4 misses blocks 1 and 2.
		disconnect(node4);

		await runMany(nodes);
		await snoozeForBlock(others, 2);

		const [commit1, commit2] = await getCommits(node0, 1, 2);
		const commitProcessor = commitProcessorOf(node4);

		// Block 2 cannot be applied before block 1...
		assert.equal(await commitProcessor.process(commit2), Skipped);
		await assertBlockNumber([node4], 0);

		// ...block 1 can, and only once...
		assert.equal(await commitProcessor.process(commit1), Accepted);
		await assertBlockNumber([node4], 1);
		assert.equal(await commitProcessor.process(commit1), Skipped);
		await assertBlockNumber([node4], 1);

		// ...and then block 2.
		assert.equal(await commitProcessor.process(commit2), Accepted);
		await assertBlockNumber([node4], 2);
		await assertBlockHash([node4], commit2.block.hash);
	});

	it("should tell a genuine proof from a tampered one", async ({ nodes }) => {
		await runMany(nodes);
		await snoozeForBlock(nodes, 2);

		const [commit1, commit2] = await getCommits(nodes[0], 1, 2);
		const commitProcessor = commitProcessorOf(nodes[0]);

		assert.true(await commitProcessor.hasValidSignature(commit1, commit1.block.parentHash));
		assert.true(await commitProcessor.hasValidSignature(commit2, commit2.block.parentHash));

		// The precommits were cast for another round...
		assert.false(
			await commitProcessor.hasValidSignature(
				{ ...commit1, proof: { ...commit1.proof, round: commit1.proof.round + 1 } },
				commit1.block.parentHash,
			),
		);

		// ...or on another chain: the precommits bind the previous block...
		assert.false(await commitProcessor.hasValidSignature(commit1, "ff".repeat(32)));

		// ...or for another block: a proof cannot be reused...
		assert.false(
			await commitProcessor.hasValidSignature({ ...commit2, proof: commit1.proof }, commit2.block.parentHash),
		);

		// ...or the proof names other signers than the ones that signed.
		const signers = [...commit1.proof.validators];
		signers[signers.indexOf(true)] = false;
		assert.false(
			await commitProcessor.hasValidSignature(
				{ ...commit1, proof: { ...commit1.proof, validators: signers } },
				commit1.block.parentHash,
			),
		);
	});

	it("should not apply a commit whose block is invalid, whatever its proof claims", async ({ nodes, validators }) => {
		const node0 = getNodeForValidator(nodes, validators[0]);
		const node4 = getNodeForValidator(nodes, validators[4]);

		// A block with a wrong reward, wrapped in a commit that claims every validator signed it. The signature
		// is not checked here, the P2P layer does that before handing a commit over; the block itself is.
		const proposal = await makeCustomProposal({ app: node0, validators }, [], { reward: 1n });
		const forgedCommit: Contracts.Crypto.Commit = {
			block: proposal.getPayload().block,
			proof: {
				round: 0,
				signature: "00".repeat(96),
				validators: Array.from({ length: totalNodes }, () => true),
			},
			serialized: "",
		};

		const invalidBlock = snoozeForInvalidBlock(node4, 1);
		assert.equal(await commitProcessorOf(node4).process(forgedCommit), Invalid);
		assertInvalidBlock([await invalidBlock], Exceptions.InvalidReward, 1);
		await assertBlockNumber([node4], 0);

		// Consensus goes on to confirm a proper block 1 on every node, node 4 included.
		await runMany(nodes);
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
		assert.not.equal((await getLastCommit(node4)).block.hash, proposal.blockHeader.hash);
	});
});

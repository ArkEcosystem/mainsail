import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
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
	snoozeUntil,
} from "./utilities.js";

type Node = Contracts.Kernel.Application;

// Round 0 is entered on the commit of the previous block, while the earliest timestamp its block may carry lies a
// block time ahead. A wide block time with a tight tolerance opens a window of most of a second in which a proposal
// for the running round arrives before that timestamp, less the tolerance, has passed on the local clock.
const baseTimeouts = crypto.milestones[0].timeouts;
if (baseTimeouts === undefined) {
	throw new Error("The genesis milestone of the test config carries no timeouts");
}

const timeouts = { ...baseTimeouts, blockTime: 1000, tolerance: 10 };
const cryptoWithWideBlockTime = structuredClone(crypto);
cryptoWithWideBlockTime.milestones[0].timeouts = timeouts;

describe<{
	nodes: Node[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Early proposal", ({ beforeEach, afterEach, it, assert }) => {
	const totalNodes = 5;

	const consensusOf = (node: Node) => node.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service);

	const lastBlockOf = (node: Node) => node.get<Contracts.State.Store>(Identifiers.State.Store).getLastBlock();

	const proposerOf = (node: Node, blockNumber: number, round: number, validators: Validator[]): Validator => {
		const { proposer } = node
			.get<Contracts.Consensus.RoundStateRepository>(Identifiers.Consensus.RoundStateRepository)
			.getRoundState(blockNumber, round);

		const validator = validators.find((validator) => validator.address === proposer.address);
		if (!validator) {
			throw new Error(`No validator with address ${proposer.address}`);
		}

		return validator;
	};

	beforeEach(async (context) => {
		context.p2p = new P2PRegistry();

		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(
					index,
					context.p2p,
					cryptoWithWideBlockTime,
					prepareNodeValidators(validators, index, totalNodes),
				),
			);
		}

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);

		context.validators = await getValidatorsInSlotOrder(context.nodes[0], validators);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("should accept a proposal for the running round before its minimal timestamp, and prevote nil for its block", async ({
		nodes,
		validators,
		p2p,
	}) => {
		await runMany(nodes);
		await snoozeForBlock(nodes);
		await assertBlockNumber(nodes, 1);
		await snoozeUntil(() => nodes.every((node) => consensusOf(node).getBlockNumber() === 2));

		// The proposal of the round's proposer, stamped at the earliest allowed timestamp, only sent right away
		// instead of at that timestamp.
		const node0 = nodes[0];
		const proposer = proposerOf(node0, 2, 0, validators);
		const timestamp = lastBlockOf(node0).timestamp + timeouts.blockTime;
		const proposal = await makeProposal(getNodeForValidator(nodes, proposer), proposer, 2, 0, timestamp);
		await p2p.broadcastProposal(proposal);
		assert.true(Date.now() + 100 < timestamp - timeouts.tolerance); // Sent well inside the window

		// Every node is in round 0 already, so the round cannot lie ahead of time for any of them. Each accepts the
		// proposal once and gossips it on; the copies that come back are skipped as duplicates.
		const acceptedBy = () =>
			p2p.results.get(proposal).filter((result) => result === Enums.Consensus.ProcessorResult.Accepted).length;
		await snoozeUntil(() => acceptedBy() === totalNodes);
		assert.equal(acceptedBy(), totalNodes);
		assert.false(p2p.results.get(proposal).includes(Enums.Consensus.ProcessorResult.Invalid));

		// The block itself is from the future for all of them: nil prevotes, and the fresh proposal of round 1 wins.
		await snoozeUntil(() => p2p.precommits.getMessages(2, 0).length === totalNodes);
		assert.equal(p2p.proposals.getMessages(2, 0).length, 1);
		assert.equal(
			p2p.prevotes.getMessages(2, 0).map((prevote) => prevote.blockHash),
			Array.from({ length: totalNodes }).fill(undefined),
		);

		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 2, 1);
		await assertBlockHash(nodes, 2);
		assert.not.equal((await getLastCommit(node0)).block.hash, proposal.blockHeader.hash);
	});
});

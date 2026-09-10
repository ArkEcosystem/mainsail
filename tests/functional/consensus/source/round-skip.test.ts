import type { Contracts } from "@mainsail/contracts";
import { Events, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound, assertCommitRound } from "./asserts.js";
import type { Validator } from "./contracts.js";
import { disconnect, skipProposalsBeforeRound } from "./faults.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import { getNodeForValidator, getValidatorsInSlotOrder, prepareNodeValidators, snoozeForBlock } from "./utilities.js";

describe<{
	nodes: Contracts.Kernel.Application[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Round skip", ({ beforeEach, afterEach, it, assert, stub }) => {
	const totalNodes = 5;

	// Records the rounds every node starts for `blockNumber`, in order.
	const recordStartedRounds = (nodes: Contracts.Kernel.Application[], blockNumber: number): number[][] => {
		const startedRounds = nodes.map(() => [] as number[]);

		for (const [index, node] of nodes.entries()) {
			node.get<Contracts.Kernel.EventDispatcher<Contracts.Consensus.State>>(
				Identifiers.Services.EventDispatcher.Service,
			).listen(Events.ConsensusEvent.RoundStarted, {
				handle: async ({ data }: { data: Contracts.Consensus.State }): Promise<void> => {
					if (data.blockNumber === blockNumber) {
						startedRounds[index].push(data.round);
					}
				},
			});
		}

		return startedRounds;
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

	it("should pull a node that fell behind straight into the round the others are in", async ({
		nodes,
		validators,
		p2p,
	}) => {
		const skippedTo = 2;
		const node0 = getNodeForValidator(nodes, validators[0]);
		const node4 = getNodeForValidator(nodes, validators[4]);
		const others = nodes.filter((node) => node !== node4);
		const startedRounds = recordStartedRounds(nodes, 1);

		// Node 4 is cut off from the network. Meanwhile the proposer fails to build a block in rounds 0 and 1, so
		// those rounds end on nil for the four connected nodes, as the protocol prescribes. Node 4, hearing
		// nothing, stays in round 0. It is reconnected the moment the proposer starts round 2, before any message
		// of that round exists, so everything it then hears is genuine.
		const reconnect = disconnect(stub, node4);
		skipProposalsBeforeRound(stub, node0, skippedTo, reconnect);

		await runMany(nodes);
		await snoozeForBlock(nodes);

		// The connected nodes went through every round. Node 4 went from round 0 straight to round 2 on the round-2
		// prevotes of f+1 of them (Tendermint line 55), without ever going through round 1.
		for (const node of others) {
			assert.equal(startedRounds[nodes.indexOf(node)], [0, 1, skippedTo]);
		}
		assert.equal(startedRounds[nodes.indexOf(node4)], [0, skippedTo]);

		// Rounds 0 and 1: no proposal, the four connected nodes prevote and precommit nil, node 4 is not heard from.
		for (const round of [0, 1]) {
			assert.equal(p2p.proposals.getMessages(1, round).length, 0);
			assert.equal(
				p2p.prevotes.getMessages(1, round).map((prevote) => prevote.blockHash),
				Array.from({ length: totalNodes - 1 }).fill(undefined),
			);
			assert.equal(
				p2p.precommits.getMessages(1, round).map((precommit) => precommit.blockHash),
				Array.from({ length: totalNodes - 1 }).fill(undefined),
			);
		}

		// Round 2: a fresh proposal, and all five nodes, node 4 included, prevote and precommit it.
		const [proposal] = p2p.proposals.getMessages(1, skippedTo);
		assert.defined(proposal);
		assert.undefined(proposal.validRound);

		assert.equal(p2p.proposals.getMessages(1, skippedTo).length, 1); // Assert number of proposals
		assert.equal(
			p2p.prevotes.getMessages(1, skippedTo).map((prevote) => prevote.blockHash),
			Array.from({ length: totalNodes }).fill(proposal.blockHeader.hash),
		);
		assert.equal(
			p2p.precommits.getMessages(1, skippedTo).map((precommit) => precommit.blockHash),
			Array.from({ length: totalNodes }).fill(proposal.blockHeader.hash),
		);

		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, skippedTo);
		await assertCommitRound(nodes, skippedTo);
		await assertBlockHash(nodes, proposal.blockHeader.hash);

		// Next block
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
	});
});

import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import {
	getNodeForValidator,
	getValidatorsInSlotOrder,
	makePrevote,
	makeProposal,
	prepareNodeValidators,
	snoozeForBlock,
	snoozeUntil,
} from "./utilities.js";

describe<{
	nodes: Contracts.Kernel.Application[];
	validators: Validator[];
	p2p: P2PRegistry;
}>("Round ahead of time", ({ beforeEach, afterEach, it, assert }) => {
	const totalNodes = 5;

	// With the test timeouts (blockTime, stageTimeout and stageTimeoutIncrease are all 200ms) round 5 of a block
	// cannot legitimately start until 3.2s after the previous block, far beyond the 200ms tolerance.
	const futureRound = 5;

	const allSkipped = Array.from<Enums.Consensus.ProcessorResult>({ length: totalNodes }).fill(
		Enums.Consensus.ProcessorResult.Skipped,
	);

	// `BlockEvent.Applied` fires inside the commit, before consensus advances to the next block number, so a
	// message for the next block has to wait for consensus itself; otherwise it is skipped for the wrong reason.
	const snoozeForConsensusBlockNumber = async (
		nodes: Contracts.Kernel.Application[],
		blockNumber: number,
	): Promise<void> => {
		await snoozeUntil(() =>
			nodes.every(
				(node) =>
					node.get<Contracts.Consensus.Service>(Identifiers.Consensus.Service).getBlockNumber() ===
					blockNumber,
			),
		);
	};

	const hasRoundState = (node: Contracts.Kernel.Application, blockNumber: number, round: number): boolean =>
		node
			.get<Contracts.Consensus.RoundStateRepository>(Identifiers.Consensus.RoundStateRepository)
			.getRoundStates()
			.some((roundState) => roundState.blockNumber === blockNumber && roundState.round === round);

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

	it("should skip a proposal for a round that cannot have started yet", async ({ nodes, validators, p2p }) => {
		await runMany(nodes);
		await snoozeForBlock(nodes);
		await assertBlockNumber(nodes, 1);
		await snoozeForConsensusBlockNumber(nodes, 2);

		const node0 = getNodeForValidator(nodes, validators[0]);
		const proposal = await makeProposal(node0, validators[0], 2, futureRound, Date.now());
		await p2p.broadcastProposal(proposal);

		await snoozeUntil(() => p2p.results.get(proposal).length === totalNodes);

		// Skipped rather than invalid: a peer that is merely ahead of us is not misbehaving.
		assert.equal(p2p.results.get(proposal), allSkipped);
		for (const node of nodes) {
			assert.false(hasRoundState(node, 2, futureRound));
		}

		// The dropped proposal does not disturb the current round.
		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
	});

	it("should skip a prevote for a round that cannot have started yet", async ({ nodes, validators, p2p }) => {
		await runMany(nodes);
		await snoozeForBlock(nodes);
		await assertBlockNumber(nodes, 1);
		await snoozeForConsensusBlockNumber(nodes, 2);

		const node1 = getNodeForValidator(nodes, validators[1]);
		const prevote = await makePrevote(node1, validators[1], 2, futureRound);
		await p2p.broadcastMessage(prevote);

		await snoozeUntil(() => p2p.results.get(prevote).length === totalNodes);

		assert.equal(p2p.results.get(prevote), allSkipped);
		for (const node of nodes) {
			assert.false(hasRoundState(node, 2, futureRound));
		}

		await snoozeForBlock(nodes, 2);
		await assertBlockNumber(nodes, 2);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);
	});
});

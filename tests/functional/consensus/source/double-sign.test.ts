import { Enums, Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";
import { DoubleSignGuard } from "@mainsail/validator/distribution/double-sign-guard.js";
import { writeFileSync } from "fs";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber, assertBlockRound } from "./asserts.js";
import { Validator } from "./contracts.js";
import { P2PRegistry } from "./p2p.js";
import { boot, bootMany, bootstrap, bootstrapMany, runMany, setup, stop, stopMany } from "./setup.js";
import { getNodeForValidator, getValidatorsInSlotOrder, prepareNodeValidators, snoozeForBlock } from "./utilities.js";
import type { Contracts } from "@mainsail/contracts";

const { Propose, Prevote } = Enums.Consensus.Step;

describe<{
	nodes: Contracts.Kernel.Application[],
	validators: Validator[];
	p2p: P2PRegistry;
}>("DoubleSign", ({ beforeEach, afterEach, it, assert }) => {
	const totalNodes = 5;

	// The state file a validator wrote before it crashed: it already signed `position`, and only
	// this record survived the restart. The node keeps the real double-sign guard (setup replaces
	// it with a noop for the scenarios that deliberately equivocate).
	const restoreCrashedValidator = (
		node: Contracts.Kernel.Application,
		validator: Validator,
		position: { blockNumber: number; round: number; step: Enums.Consensus.Step; value?: string },
	) => {
		writeFileSync(
			node.dataPath("validator-state.json"),
			JSON.stringify({ [validator.consensusPublicKey]: position }),
		);
		node.rebind(Identifiers.Validator.DoubleSignGuard).to(DoubleSignGuard).inSingletonScope();
	};

	beforeEach(async (context) => {
		context.p2p = new P2PRegistry();

		context.nodes = [];
		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, context.p2p, crypto, prepareNodeValidators(validators, index, totalNodes)),
			);
		}

		// These tests plant crash state before the real nodes boot, but slot order only exists on a
		// bootstrapped chain — learn it from a throwaway observer (no validators, isolated P2P).
		const probe = await setup(totalNodes, new P2PRegistry(), crypto, { secrets: [] });
		await boot(probe);
		await bootstrap(probe);
		context.validators = await getValidatorsInSlotOrder(probe, validators);
		await stop(probe);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("should skip the conflicting prevote after a restart and still confirm the block", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// The slot-1 validator prevoted some other block at (1, 0) in its previous life and crashed
		// before the network decided; prevoting the freshly proposed block now would double-sign.
		restoreCrashedValidator(getNodeForValidator(nodes, validators[1]), validators[1], {
			blockNumber: 1,
			round: 0,
			step: Prevote,
			value: "ff".repeat(32),
		});

		await bootMany(nodes);
		await bootstrapMany(nodes);
		await runMany(nodes);
		await snoozeForBlock(nodes);

		// The restarted validator skipped its prevote at the recorded position...
		assert.equal(p2p.prevotes.getMessagesByValidator(1, 0, 1).length, 0);
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes - 1);

		// ...but the remaining +2/3 prevotes confirm the block on every node, including node 1,
		// and later steps at the same position are past the watermark and unaffected.
		assert.equal(p2p.precommits.getMessages(1, 0).length, totalNodes);
		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 0);
		await assertBlockHash(nodes);

		// The chain has moved past the watermark, so the validator signs again normally.
		await snoozeForBlock(nodes);
		await assertBlockNumber(nodes, 2);
		assert.equal(p2p.prevotes.getMessages(2, 0).length, totalNodes);
	});

	it("should skip the conflicting re-proposal after a restart and confirm the block in the next round", async ({
		nodes,
		validators,
		p2p,
	}) => {
		// The slot-0 validator - the proposer - proposed some other block at (1, 0) and crashed;
		// rebuilding and signing a new block for the same position would double-propose.
		restoreCrashedValidator(getNodeForValidator(nodes, validators[0]), validators[0], {
			blockNumber: 1,
			round: 0,
			step: Propose,
			value: "ff".repeat(32),
		});

		await bootMany(nodes);
		await bootstrapMany(nodes);
		await runMany(nodes);
		await snoozeForBlock(nodes);

		// No proposal went out at round 0; every validator (the proposer included) prevoted nil
		// after the propose timeout, which is a later step and past the watermark.
		assert.equal(p2p.proposals.getMessages(1, 0).length, 0);
		assert.equal(p2p.prevotes.getMessages(1, 0).length, totalNodes);

		// The next round is past the watermark, so the same proposer proposes and the block confirms.
		assert.equal(p2p.proposals.getMessages(1, 1).length, 1);
		await assertBlockNumber(nodes, 1);
		await assertBlockRound(nodes, 1);
		await assertBlockHash(nodes);
	});
});

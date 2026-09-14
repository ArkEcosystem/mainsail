import { describe } from "@mainsail/test-runner";

import crypto from "../config/crypto.json" with { type: "json" };
import validators from "../config/validators.json" with { type: "json" };
import { assertBlockHash, assertBlockNumber } from "./asserts.js";
import { P2PRegistry } from "./p2p.js";
import { bootMany, bootstrapMany, runMany, setup, stopMany } from "./setup.js";
import { prepareNodeValidators, snoozeForBlock } from "./utilities.js";
import type { Contracts } from "@mainsail/contracts";

describe<{
	nodes: Contracts.Kernel.Application[];
}>("Base", ({ beforeEach, afterEach, it }) => {
	beforeEach(async (context) => {
		const p2pRegistry = new P2PRegistry();

		const totalNodes = 2;

		context.nodes = [];

		for (let index = 0; index < totalNodes; index++) {
			context.nodes.push(
				await setup(index, p2pRegistry, crypto, prepareNodeValidators(validators, index, totalNodes)),
			);
		}

		await bootMany(context.nodes);
		await bootstrapMany(context.nodes);
		await runMany(context.nodes);
	});

	afterEach(async ({ nodes }) => {
		await stopMany(nodes);
	});

	it("should confirm a block", async ({ nodes }) => {
		await snoozeForBlock(nodes);

		await assertBlockNumber(nodes, 1);
		await assertBlockHash(nodes, 1);
	});

	it("should confirm 3 blocks", async ({ nodes }) => {
		await snoozeForBlock(nodes, 3);

		await assertBlockNumber(nodes, 3);
		await assertBlockHash(nodes, 3);
	});
});

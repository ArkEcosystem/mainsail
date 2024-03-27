import { describe, Sandbox } from "@mainsail/test-framework";

import { P2PRegistry } from "./p2p";
import { setup, run } from "./setup";

describe<{
	node1: Sandbox;
	node2: Sandbox;
}>("Consensus", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		const p2pRegistry = new P2PRegistry();

		context.node1 = await setup(1, p2pRegistry);
		context.node2 = await setup(2, p2pRegistry);

		run(context.node1);
		run(context.node2);
	});

	it("should be ok", () => {
		assert.true(true);
	});
});

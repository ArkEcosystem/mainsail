import { describe, Sandbox } from "@mainsail/test-framework";

import { P2PRegistry } from "./p2p";
import { setup } from "./setup";

describe<{
	node1: Sandbox;
	node2: Sandbox;
}>("Consensus", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const p2pRegistry = new P2PRegistry();

		context.node1 = setup(1, p2pRegistry);
		context.node2 = setup(2, p2pRegistry);
	});

	it("should be ok", () => {
		assert.true(true);
	});
});

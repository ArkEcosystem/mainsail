import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import { P2PRegistry } from "./p2p";
import { run, setup } from "./setup";

describe<{
	node1: Sandbox;
	node2: Sandbox;
}>("Consensus", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		const p2pRegistry = new P2PRegistry();

		context.node1 = await setup(1, p2pRegistry, crypto);
		context.node2 = await setup(2, p2pRegistry, crypto);

		run(context.node1);
		run(context.node2);
	});

	it("should be ok", () => {
		assert.true(true);
	});
});

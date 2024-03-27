import { describe, Sandbox } from "@mainsail/test-framework";

import crypto from "../config/crypto.json";
import validators from "../config/validators.json";
import { P2PRegistry } from "./p2p";
import { run, setup } from "./setup";
import { prepareNodeValidators } from "./utils";

describe<{
	node0: Sandbox;
	node1: Sandbox;
}>("Consensus", ({ beforeEach, it, assert }) => {
	beforeEach(async (context) => {
		const p2pRegistry = new P2PRegistry();

		const totalNodes = 2;

		context.node0 = await setup(0, p2pRegistry, crypto, prepareNodeValidators(validators, 0, totalNodes));
		context.node1 = await setup(1, p2pRegistry, crypto, prepareNodeValidators(validators, 1, totalNodes));

		run(context.node0);
		run(context.node1);
	});

	it("should be ok", () => {
		assert.true(true);
	});
});

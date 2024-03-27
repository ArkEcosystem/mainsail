import { describe, Sandbox } from "@mainsail/test-framework";

import { setup } from "./setup";

describe<{
	node1: Sandbox;
	node2: Sandbox;
}>("Consensus", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.node1 = setup(1);
		context.node2 = setup(2);
	});

	it("should be ok", () => {
		assert.true(true);
	});
});

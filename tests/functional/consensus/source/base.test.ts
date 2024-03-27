import { describe, Sandbox } from "@mainsail/test-framework";
import { join } from "path";

import { setup } from "./setup";

describe<{
	node1: Sandbox;
	node2: Sandbox;
}>("Consensus", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.node1 = setup(join(import.meta.dirname, "../paths/node1"));
		context.node2 = setup(join(import.meta.dirname, "../paths/node2"));
	});

	it("should be ok", () => {
		assert.true(true);
	});
});

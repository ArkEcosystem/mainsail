import { describe, Sandbox } from "@mainsail/test-framework";
import { setup } from "./setup";

describe<{
	sandbox: Sandbox;
}>("Consensus", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.sandbox = setup();
	});

	it("should be ok", () => {
		assert.true(true);
	});
});

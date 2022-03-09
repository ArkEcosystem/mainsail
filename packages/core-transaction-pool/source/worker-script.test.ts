import { describe } from "@arkecosystem/core-test-framework";

describe("worker-script.ts", ({ it, assert }) => {
	it("should not crash", () => {
		assert.not.throws(() => require("./worker-script"));
	});
});

import { describe } from "@mainsail/test-runner";
import { isGreaterThan } from "./is-greater-than";

describe("isGreaterThan", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isGreaterThan(2, 1));
	});

	it("should fail", () => {
		assert.false(isGreaterThan(1, 2));
	});
});

import { describe } from "../../core-test-framework";
import { isGreaterThanOrEqual } from "./is-greater-than-or-equal";

describe("isGreaterThanOrEqual", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isGreaterThanOrEqual(2, 1));
		assert.true(isGreaterThanOrEqual(1, 1));
	});

	it("should fail", () => {
		assert.false(isGreaterThanOrEqual(5, 10));
	});
});

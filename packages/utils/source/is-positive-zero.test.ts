import { describe } from "../../core-test-framework";
import { isPositiveZero } from "./is-positive-zero";

describe("isPositiveZero", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isPositiveZero(+0));
		assert.true(isPositiveZero(0));
	});

	it("should fail", () => {
		assert.false(isPositiveZero(-0));
		assert.false(isPositiveZero(-1));
	});
});

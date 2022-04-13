import { describe } from "../../core-test-framework";

import { isNegativeZero } from "./is-negative-zero";

describe("isNegativeZero", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isNegativeZero(-0));
	});

	it("should fail", () => {
		assert.false(isNegativeZero(+0));
		assert.false(isNegativeZero(0));
		assert.false(isNegativeZero(-1));
	});
});

import { describe } from "../../core-test-framework";

import { includes } from "./includes";

describe("includes", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		assert.true(includes([1, 2, 3], 1));

		assert.false(includes([1, 2, 3], 4));

		assert.true(includes({ a: 1, b: 2 }, 1));

		assert.true(includes("abcd", "bc"));

		assert.false(includes(1, 2));
	});
});

import { describe } from "../../core-test-framework";

import { min } from "./min";

describe("min", async ({ assert, it, nock, loader }) => {
	it("should return the smallest number", () => {
		assert.is(min([1, 0]), 0);
		assert.is(min([1, 2, 3, 4, 5]), 1);
	});
});

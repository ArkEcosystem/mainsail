import { describe } from "../../core-test-framework";

import { isBetween } from "./is-between";

describe("isBetween", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isBetween(2, 1, 3));
	});

	it("should fail", () => {
		assert.false(isBetween(1, 2, 3));
	});
});

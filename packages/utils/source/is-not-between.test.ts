import { describe } from "../../core-test-framework";
import { isNotBetween } from "./is-not-between";

describe("isNotBetween", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isNotBetween(1, 2, 3));
	});

	it("should fail", () => {
		assert.false(isNotBetween(2, 1, 3));
	});
});

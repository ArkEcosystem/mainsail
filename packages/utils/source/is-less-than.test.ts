import { describe } from "../../core-test-framework";
import { isLessThan } from "./is-less-than";

describe("isLessThan", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isLessThan(5, 10));
	});

	it("should fail", () => {
		assert.false(isLessThan(10, 5));
	});
});

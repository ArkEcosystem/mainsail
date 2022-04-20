import { describe } from "../../core-test-framework";
import { isPositive } from "./is-positive";

describe("isPositive", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isPositive(1));
	});

	it("should fail", () => {
		assert.false(isPositive(-1));
	});
});

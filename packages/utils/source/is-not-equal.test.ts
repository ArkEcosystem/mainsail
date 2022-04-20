import { describe } from "../../core-test-framework";
import { isNotEqual } from "./is-not-equal";

describe("isNotEqual", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isNotEqual(1, "1"));
	});

	it("should fail", () => {
		assert.false(isNotEqual(1, 1));
	});
});

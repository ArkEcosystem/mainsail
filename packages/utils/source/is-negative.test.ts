import { describe } from "../../test-framework/source";
import { isNegative } from "./is-negative";

describe("isNegative", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isNegative(-1));
	});

	it("should fail", () => {
		assert.false(isNegative(1));
	});
});

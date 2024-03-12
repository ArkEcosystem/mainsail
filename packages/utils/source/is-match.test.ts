import { describe } from "../../test-framework/source";
import { isMatch } from "./is-match";

describe("isMatch", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isMatch("a", /a/));
	});

	it("should fail", () => {
		assert.false(isMatch(1, /a/));
	});
});

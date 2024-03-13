import { describe } from "../../test-framework/source";
import { isRegExp } from "./is-reg-exp";

describe("isRegExp", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isRegExp(/a/));
	});

	it("should fail", () => {
		assert.false(isRegExp([]));
	});
});

import { describe } from "../../test-framework/source";
import { isFalse } from "./is-false";

describe("isFalse", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isFalse(false));
	});

	it("should fail", () => {
		assert.false(isFalse(true));
	});
});

import { describe } from "../../test-framework/source";
import { isTrue } from "./is-true";

describe("isTrue", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isTrue(true));
	});

	it("should fail", () => {
		assert.false(isTrue(false));
	});
});

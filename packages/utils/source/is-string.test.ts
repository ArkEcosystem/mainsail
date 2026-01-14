import { describe } from "@mainsail/test-runner";
import { isString } from "./is-string";

describe("isString", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isString("string"));
	});

	it("should fail", () => {
		assert.false(isString(1));
	});
});

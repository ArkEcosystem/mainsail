import { describe } from "@mainsail/test-runner";
import { isObject } from "./is-object";

describe("isObject", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isObject({ key: "value" }));
	});

	it("should fail", () => {
		assert.false(isObject(1));
	});

	it("should fail for null", () => {
		assert.false(isObject(null));
	});
});

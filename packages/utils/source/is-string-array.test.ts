import { describe } from "../../core-test-framework";
import { isStringArray } from "./is-string-array";

describe("isStringArray", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isStringArray(["string"]));
	});

	it("should fail", () => {
		assert.false(isStringArray([1]));
	});
});

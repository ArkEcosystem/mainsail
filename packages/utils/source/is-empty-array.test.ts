import { describe } from "../../core-test-framework";
import { isEmptyArray } from "./is-empty-array";

describe("isEmptyArray", async ({ assert, it }) => {
	it("should return true for an empty array", () => {
		assert.true(isEmptyArray([]));
	});
});

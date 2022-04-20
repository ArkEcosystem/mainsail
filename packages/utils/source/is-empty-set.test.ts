import { describe } from "../../core-test-framework";
import { isEmptySet } from "./is-empty-set";

describe("isEmptySet", async ({ assert, it, nock, loader }) => {
	it("should return true for an empty set", () => {
		assert.true(isEmptySet(new Set()));
	});
});

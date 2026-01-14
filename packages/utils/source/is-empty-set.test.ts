import { describe } from "@mainsail/test-runner";
import { isEmptySet } from "./is-empty-set";

describe("isEmptySet", async ({ assert, it, nock, loader }) => {
	it("should return true for an empty set", () => {
		assert.true(isEmptySet(new Set()));
	});
});

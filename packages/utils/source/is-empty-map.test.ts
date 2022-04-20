import { describe } from "../../core-test-framework";
import { isEmptyMap } from "./is-empty-map";

describe("isEmptyMap", async ({ assert, it, nock, loader }) => {
	it("should return true for an empty map", () => {
		assert.true(isEmptyMap(new Map()));
	});
});

import { describe } from "../../core-test-framework";
import { hasProperty } from "./has-property";

describe("hasProperty", async ({ assert, it, nock, loader }) => {
	it("should return true if the object has a given property", () => {
		assert.true(hasProperty({ property: undefined }, "property"));
	});

	it("should return false if the object doesn't have a given property", () => {
		assert.false(hasProperty({ property: undefined }, "not-present"));
	});
});

import { describe } from "../../core-test-framework";

import { firstMapKey } from "./first-map-key";

describe("#firstMapKey", ({ it, assert }) => {
	it("should return the first key", () => {
		assert.equal(firstMapKey(new Map([["Hello", "World"]])), "Hello");
	});
});

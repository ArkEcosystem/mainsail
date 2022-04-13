import { describe } from "../../core-test-framework";

import { cloneArray } from "./clone-array";

describe("#cloneArray", ({ it, assert }) => {
	it("should work like lodash", () => {
		const objects = [{ a: 1 }, { b: 2 }];

		assert.equal(cloneArray(objects), objects);
	});
});

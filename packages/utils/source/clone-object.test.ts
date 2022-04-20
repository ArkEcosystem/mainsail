import { describe } from "../../core-test-framework";
import { cloneObject } from "./clone-object";

describe("#cloneObject", ({ it, assert }) => {
	it("should work like lodash", () => {
		const objects = { a: 1 };

		assert.equal(cloneObject(objects), objects);
	});
});

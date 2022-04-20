import { describe } from "../../core-test-framework";
import { clone } from "./clone";

describe("#clone", ({ it, assert }) => {
	it("should work with an array", () => {
		const objects = [{ a: 1 }, { b: 2 }];

		assert.equal(clone(objects), objects);
	});

	it("should work with an object", () => {
		const objects = { a: 1 };

		assert.equal(clone(objects), objects);
	});
});

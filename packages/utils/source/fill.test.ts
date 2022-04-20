import { describe } from "../../core-test-framework";
import { fill } from "./fill";

describe("#fill", ({ it, assert }) => {
	it("should work with an array", () => {
		assert.equal(fill([1, 2, 3], "a"), ["a", "a", "a"]);
		assert.equal(fill(Array.from({ length: 3 }), 2), [2, 2, 2]);
		assert.equal(fill([4, 6, 8, 10], "*", 1, 3), [4, "*", "*", 10]);
	});
});

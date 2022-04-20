import { describe } from "../../core-test-framework";
import { findKey } from "./find-key";

describe("#findKey", ({ it, assert }) => {
	it("should work with a function", () => {
		assert.equal(
			findKey(
				{
					barney: { active: true, age: 36 },
					fred: { active: false, age: 40 },
					pebbles: { active: true, age: 1 },
				},
				(o) => o.age < 40,
			),
			"barney",
		);
	});
});

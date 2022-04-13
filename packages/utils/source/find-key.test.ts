import { describe } from "../../core-test-framework";

import { findKey } from "./find-key";

describe("#findKey", ({ it, assert }) => {
	it("should work with a function", () => {
		assert.equal(
			findKey(
				{
					barney: { age: 36, active: true },
					fred: { age: 40, active: false },
					pebbles: { age: 1, active: true },
				},
				(o) => o.age < 40,
			),
			"barney",
		);
	});
});

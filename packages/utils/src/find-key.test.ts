import "jest-extended";

import { findKey } from "./find-key";

describe("#findKey", () => {
	it("should work with a function", () => {
		expect(
			findKey(
				{
					barney: { age: 36, active: true },
					fred: { age: 40, active: false },
					pebbles: { age: 1, active: true },
				},
				(o) => o.age < 40,
			),
		).toBe("barney");
	});
});

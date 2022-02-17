import "jest-extended";

import { reduceObject } from "./reduce-object";

describe("#reduceObject", () => {
	it("should work with a function", () => {
		expect(
			reduceObject(
				{ a: 1, b: 2, c: 1 },
				(result, value, key) => {
					(result[value] || (result[value] = [])).push(key);

					return result;
				},
				{},
			),
		).toEqual({ "1": ["a", "c"], "2": ["b"] });
	});
});

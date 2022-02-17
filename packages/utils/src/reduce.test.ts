import "jest-extended";

import { reduce } from "./reduce";

describe("#reduce", () => {
	it("should work with an array", () => {
		expect(reduce([1, 2], (sum, n) => sum + n, 0)).toBe(3);
	});

	it("should work with an object", () => {
		expect(
			reduce(
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

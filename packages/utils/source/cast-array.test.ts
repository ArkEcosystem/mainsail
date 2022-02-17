import "jest-extended";

import { castArray } from "./cast-array";

describe("#castArray", () => {
	it("should work with any value", () => {
		expect(castArray(1)).toEqual([1]);
		expect(castArray([1])).toEqual([1]);
		expect(castArray({ a: 1 })).toEqual([{ a: 1 }]);
		expect(castArray("abc")).toEqual(["abc"]);
		expect(castArray(null)).toEqual([]);
		expect(castArray(undefined)).toEqual([]);
		expect(castArray(new Map([["key", "value"]]).keys())).toEqual(["key"]);
	});
});

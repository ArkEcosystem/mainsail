import "jest-extended";

import { includes } from "./includes";

describe("#includes", () => {
	it("should work with a function", () => {
		expect(includes([1, 2, 3], 1)).toBeTrue();

		expect(includes([1, 2, 3], 4)).toBeFalse();

		expect(includes({ a: 1, b: 2 }, 1)).toBeTrue();

		expect(includes("abcd", "bc")).toBeTrue();

		expect(includes(1, 2)).toBeFalse();
	});
});

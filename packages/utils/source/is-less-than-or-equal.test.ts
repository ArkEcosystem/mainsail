import "jest-extended";

import { isLessThanOrEqual } from "./is-less-than-or-equal";

describe("#isLessThanOrEqual", () => {
	it("should pass", () => {
		expect(isLessThanOrEqual(1, 2)).toBeTrue();
		expect(isLessThanOrEqual(1, 1)).toBeTrue();
	});

	it("should fail", () => {
		expect(isLessThanOrEqual(10, 5)).toBeFalse();
	});
});

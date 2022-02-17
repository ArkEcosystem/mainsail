import "jest-extended";

import { isPositive } from "./is-positive";

describe("#isPositive", () => {
	it("should pass", () => {
		expect(isPositive(1)).toBeTrue();
	});

	it("should fail", () => {
		expect(isPositive(-1)).toBeFalse();
	});
});

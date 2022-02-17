import "jest-extended";

import { isArray } from "./is-array";

describe("#isArray", () => {
	it("should pass", () => {
		expect(isArray([1])).toBeTrue();
	});

	it("should fail", () => {
		expect(isArray(1)).toBeFalse();
	});
});

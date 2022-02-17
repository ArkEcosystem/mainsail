import "jest-extended";

import { isNumberArray } from "./is-number-array";

describe("#isNumberArray", () => {
	it("should pass", () => {
		expect(isNumberArray([1])).toBeTrue();
	});

	it("should fail", () => {
		expect(isNumberArray(["string"])).toBeFalse();
	});
});

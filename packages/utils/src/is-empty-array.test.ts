import "jest-extended";

import { isEmptyArray } from "./is-empty-array";

describe("#isEmptyArray", () => {
	it("should return true for an empty array", () => {
		expect(isEmptyArray([])).toBeTrue();
	});
});

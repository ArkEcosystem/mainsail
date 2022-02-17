import "jest-extended";

import { isEmptySet } from "./is-empty-set";

describe("#isEmptySet", () => {
	it("should return true for an empty set", () => {
		expect(isEmptySet(new Set())).toBeTrue();
	});
});

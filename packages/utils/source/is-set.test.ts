import "jest-extended";

import { isSet } from "./is-set";

describe("#isSet", () => {
	it("should pass", () => {
		expect(isSet(new Set())).toBeTrue();
	});

	it("should fail", () => {
		expect(isSet(1)).toBeFalse();
	});
});

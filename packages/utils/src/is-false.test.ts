import "jest-extended";

import { isFalse } from "./is-false";

describe("#isFalse", () => {
	it("should pass", () => {
		expect(isFalse(false)).toBeTrue();
	});

	it("should fail", () => {
		expect(isFalse(true)).toBeFalse();
	});
});

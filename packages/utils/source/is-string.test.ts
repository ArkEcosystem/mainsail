import "jest-extended";

import { isString } from "./is-string";

describe("#isString", () => {
	it("should pass", () => {
		expect(isString("string")).toBeTrue();
	});

	it("should fail", () => {
		expect(isString(1)).toBeFalse();
	});
});

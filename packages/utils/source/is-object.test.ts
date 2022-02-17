import "jest-extended";

import { isObject } from "./is-object";

describe("#isObject", () => {
	it("should pass", () => {
		expect(isObject({ key: "value" })).toBeTrue();
	});

	it("should fail", () => {
		expect(isObject(1)).toBeFalse();
	});
});

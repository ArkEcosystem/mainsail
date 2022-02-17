import "jest-extended";

import { isConstructor } from "./is-constructor";

describe("#isConstructor", () => {
	it("should pass", () => {
		expect(isConstructor(Date)).toBeTrue();
	});

	it("should fail", () => {
		expect(isConstructor([])).toBeFalse();
	});
});

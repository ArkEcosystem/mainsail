import "jest-extended";

import { isNumber } from "./is-number";

describe("#isNumber", () => {
	it("should pass", () => {
		expect(isNumber(1)).toBeTrue();
	});

	it("should fail", () => {
		expect(isNumber("1")).toBeFalse();
	});
});

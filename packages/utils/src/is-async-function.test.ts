import "jest-extended";

import { isAsyncFunction } from "./is-async-function";

describe("#isAsyncFunction", () => {
	it("should pass", () => {
		expect(isAsyncFunction(async () => ({}))).toBeTrue();
	});

	it("should fail", () => {
		expect(isAsyncFunction(new Function())).toBeFalse();
		expect(isAsyncFunction([])).toBeFalse();
	});
});

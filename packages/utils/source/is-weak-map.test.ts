import "jest-extended";

import { isWeakMap } from "./is-weak-map";

describe("#isWeakMap", () => {
	it("should pass", () => {
		expect(isWeakMap(new WeakMap())).toBeTrue();
	});

	it("should fail", () => {
		expect(isWeakMap(1)).toBeFalse();
	});
});

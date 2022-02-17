import "jest-extended";

import { isEmptyObject } from "./is-empty-object";

describe("#isEmptyObject", () => {
	it("should return true for an empty object", () => {
		expect(isEmptyObject({})).toBeTrue();
	});
});

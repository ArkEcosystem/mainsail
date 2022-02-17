import "jest-extended";

import { hasProperty } from "./has-property";

describe("#hasProperty", () => {
	it("should return true if the object has a given property", () => {
		expect(hasProperty({ property: undefined }, "property")).toBeTrue();
	});

	it("should return false if the object doesn't have a given property", () => {
		expect(hasProperty({ property: undefined }, "not-present")).toBeFalse();
	});
});

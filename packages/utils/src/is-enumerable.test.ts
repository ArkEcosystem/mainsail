import "jest-extended";

import { isEnumerable } from "./is-enumerable";

const object1 = {};
const array1 = [];
// @ts-ignore
object1.property1 = 42;
// @ts-ignore
array1[0] = 42;

describe("#isEnumerable", () => {
	it("should work with objects and arrays", () => {
		expect(isEnumerable(object1, "property1")).toBeTrue();
		expect(isEnumerable(array1, 0)).toBeTrue();
		expect(isEnumerable(array1, "length")).toBeFalse();
	});
});

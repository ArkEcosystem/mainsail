import { describe } from "../../core-test-framework";

import { isEnumerable } from "./is-enumerable";

describe("isEnumerable", async ({ assert, it, nock, loader }) => {
	it("should work with objects and arrays", () => {
		const object1 = {};
		const array1 = [];

		object1.property1 = 42;

		array1[0] = 42;

		assert.true(isEnumerable(object1, "property1"));
		assert.true(isEnumerable(array1, 0));
		assert.false(isEnumerable(array1, "length"));
	});
});

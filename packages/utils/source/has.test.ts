import { describe } from "../../core-test-framework";

import { has } from "./has";

describe("has", async ({ assert, it, nock, loader }) => {
	it("should return false if the target is not an object", () => {
		assert.false(has([], "a.b.c"));
	});

	it("should return false if the path is not a string", () => {
		assert.false(has({}, 123));
	});

	it("should not do anything if the object is not an object", () => {
		assert.false(has([], "a.b.c"));
	});

	it("should work like lodash", () => {
		const object = { a: { b: 2 } };

		assert.true(has(object, "a"));
		assert.true(has(object, "a.b"));
		assert.false(has(object, "c"));
		assert.true(has({ a: undefined }, "a"));
	});

	it("should exit early if it encounters a non-object value", () => {
		const object = { a: { b: 2 } };

		assert.false(has(object, "a.b.c"));
	});
});

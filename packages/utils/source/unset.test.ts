import { describe } from "../../core-test-framework";
import { unset } from "./unset";

describe("unset", async ({ assert, it, nock, loader }) => {
	it("should return false if the target is not an object", () => {
		assert.false(unset([], "a.b.c"));
	});

	it("should return false if the path is not a string", () => {
		assert.false(unset({}, 123));
	});

	it("should not do anything if the object is not an object", () => {
		assert.false(unset([], "a.b.c"));
	});

	it("should work with a string or array as path", () => {
		const object = { a: { b: { c: 7 } } };

		unset(object, "a.b.c");

		assert.equal(object, { a: { b: {} } });

		unset(object, "a.b.c");

		assert.equal(object, { a: { b: {} } });
	});
});

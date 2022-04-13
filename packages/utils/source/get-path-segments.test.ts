import { describe } from "../../core-test-framework";

import { getPathSegments } from "./get-path-segments";

describe("getPathSegments", async ({ assert, it, nock, loader }) => {
	it("should return an array as is", () => {
		assert.equal(getPathSegments(["a", "b"]), ["a", "b"]);
	});

	it("should return the path as array", () => {
		assert.equal(getPathSegments("a.b"), ["a", "b"]);
	});

	it("should return an empty array if any dangerous paths are used", () => {
		assert.equal(getPathSegments("a.__proto__"), []);
		assert.equal(getPathSegments("a.prototype"), []);
		assert.equal(getPathSegments("a.constructor"), []);
	});
});

import { describe } from "@mainsail/test-runner";
import { isEmpty } from "./is-empty";

describe("at", async ({ assert, it, nock, loader }) => {
	it("should return true for an empty array", () => {
		assert.true(isEmpty([]));
	});

	it("should return true for an empty object", () => {
		assert.true(isEmpty({}));
	});

	it("should return true for a false boolean", () => {
		assert.true(isEmpty(false));
	});

	it("should return true for null", () => {
		assert.true(isEmpty(null));
	});

	it("should return true for undefined", () => {
		assert.true(isEmpty(undefined));
	});

	it("should return true for an empty map", () => {
		assert.true(isEmpty(new Map()));
	});

	it("should return true for an empty set", () => {
		assert.true(isEmpty(new Set()));
	});

	it("should return false if the value contains something", () => {
		assert.false(isEmpty([1]));
	});

	it("should return false for non-empty strings, maps and sets", () => {
		assert.false(isEmpty("a"));
		assert.false(isEmpty(new Map([["a", 1]])));
		assert.false(isEmpty(new Set([1])));
		assert.false(isEmpty({ a: 1 }));
	});

	it("should return false for truthy primitives and functions", () => {
		assert.false(isEmpty(1));
		assert.false(isEmpty(true));
		assert.false(isEmpty(() => {}));
		assert.false(isEmpty(Symbol("a")));
	});
});

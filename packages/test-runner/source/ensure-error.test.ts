import { describe } from "./describe";
import { ensureError } from "./ensure-error";

describe("ensureError", ({ assert, it }) => {
	it("should return Error instances unchanged", () => {
		const error = new TypeError("boom");

		assert.is(ensureError(error), error);
	});

	it("should wrap strings in an Error", () => {
		const error = ensureError("boom");

		assert.instance(error, Error);
		assert.is(error.message, "boom");
	});

	it("should serialize objects and arrays to JSON", () => {
		assert.is(ensureError({ a: 1 }).message, '{"a":1}');
		assert.is(ensureError([1, 2]).message, "[1,2]");
	});

	it("should serialize primitives", () => {
		assert.is(ensureError(1).message, "1");
		assert.is(ensureError(true).message, "true");
		assert.is(ensureError(null).message, "null");
	});

	it("should fall back to String() when JSON serialization returns undefined", () => {
		assert.is(ensureError(undefined).message, "undefined");
	});

	it("should fall back to String() when JSON serialization throws", () => {
		const circular: { self?: unknown } = {};
		circular.self = circular;

		assert.is(ensureError(circular).message, "[object Object]");
	});
});

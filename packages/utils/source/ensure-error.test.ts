import { describe } from "@mainsail/test-runner";

import { ensureError } from "./ensure-error";

describe("ensureError", async ({ assert, it }) => {
	it("should return the same Error instance unchanged", () => {
		const error = new Error("boom");

		assert.is(ensureError(error), error);
	});

	it("should preserve Error subclasses (identity and prototype)", () => {
		class CustomError extends Error {}
		const error = new CustomError("custom");

		const result = ensureError(error);

		assert.is(result, error);
		assert.true(result instanceof CustomError);
	});

	it("should preserve built-in Error subclasses", () => {
		const error = new TypeError("bad type");

		const result = ensureError(error);

		assert.is(result, error);
		assert.true(result instanceof TypeError);
	});

	it("should wrap a string into an Error with the string as message", () => {
		const result = ensureError("just a string");

		assert.true(result instanceof Error);
		assert.is(result.message, "just a string");
	});

	it("should wrap a number", () => {
		const result = ensureError(42);

		assert.true(result instanceof Error);
		assert.is(result.message, "42");
	});

	it("should wrap a boolean", () => {
		assert.is(ensureError(true).message, "true");
		assert.is(ensureError(false).message, "false");
	});

	it("should wrap null", () => {
		const result = ensureError(null);

		assert.true(result instanceof Error);
		assert.is(result.message, "null");
	});

	it("should wrap undefined", () => {
		const result = ensureError(undefined);

		assert.true(result instanceof Error);
		assert.is(result.message, "undefined");
	});

	it("should wrap a plain object as JSON", () => {
		const result = ensureError({ code: 1, reason: "nope" });

		assert.true(result instanceof Error);
		assert.is(result.message, '{"code":1,"reason":"nope"}');
	});

	it("should wrap an array as JSON", () => {
		const result = ensureError([1, 2, 3]);

		assert.is(result.message, "[1,2,3]");
	});

	it("should wrap a bigint (JSON.stringify throws) via String fallback", () => {
		const result = ensureError(10n);

		assert.true(result instanceof Error);
		assert.is(result.message, "10");
	});

	it("should wrap a circular object (JSON.stringify throws) via String fallback", () => {
		const circular: Record<string, unknown> = {};
		circular.self = circular;

		const result = ensureError(circular);

		assert.true(result instanceof Error);
		assert.is(result.message, "[object Object]");
	});

	it("should wrap a symbol (JSON.stringify returns undefined) via String fallback", () => {
		const result = ensureError(Symbol("sym"));

		assert.true(result instanceof Error);
		assert.is(result.message, "Symbol(sym)");
	});

	it("should always return an Error and never throw", () => {
		for (const value of [undefined, null, 0, "", false, 10n, Symbol("x"), {}, [], () => {}]) {
			assert.true(ensureError(value) instanceof Error);
		}
	});
});

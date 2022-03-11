import { describe } from "../../../../core-test-framework";

import { InvalidCriteria, UnexpectedError, UnsupportedValue } from "./errors";

describe("InvalidCriteria", ({ assert, beforeEach, it }) => {
	it("should create", () => {
		const error = new InvalidCriteria(undefined, undefined, []);
		assert.equal(error.message, "Invalid criteria 'undefined' (undefined) for undefined value");
	});

	it("should create if value is object", () => {
		const error = new InvalidCriteria({ a: "a" }, undefined, []);
		assert.equal(error.message, "Invalid criteria 'undefined' (undefined) for Object value");
	});

	it("should create if value is null", () => {
		const error = new InvalidCriteria(null, undefined, []);
		assert.equal(error.message, "Invalid criteria 'undefined' (undefined) for null value");
	});

	it("should create if criteria is object", () => {
		const error = new InvalidCriteria(undefined, { a: "a" }, []);
		assert.equal(error.message, "Invalid criteria '[object Object]' (Object) for undefined value");
	});

	it("should create if criteria is null", () => {
		const error = new InvalidCriteria(undefined, null, []);
		assert.equal(error.message, "Invalid criteria 'null' for undefined value");
	});

	it("should create if path is defined", () => {
		const error = new InvalidCriteria(undefined, undefined, ["part1", "part2"]);
		assert.equal(error.message, "Invalid criteria 'undefined' (undefined) at 'part1.part2' for undefined value");
	});
});

describe("UnsupportedValue", ({ assert, beforeEach, it }) => {
	it("should create if value is undefined", () => {
		const error = new UnsupportedValue(undefined, []);
		assert.equal(error.message, "Unsupported value 'undefined' (undefined)");
	});

	it("should create if value is array", () => {
		const error = new UnsupportedValue([], []);
		assert.equal(error.message, "Unsupported value Array(0)");
	});

	it("should create if value is object", () => {
		const error = new UnsupportedValue({ a: "a" }, []);
		assert.equal(error.message, "Unsupported value '[object Object]' (Object)");
	});

	it("should create if value is null", () => {
		const error = new UnsupportedValue(null, []);
		assert.equal(error.message, "Unsupported value 'null'");
	});
	it("should create if path is defined", () => {
		const error = new UnsupportedValue(undefined, ["part1", "part2"]);
		assert.equal(error.message, "Unsupported value 'undefined' (undefined) at 'part1.part2'");
	});
});

describe("UnexpectedError", ({ assert, beforeEach, it }) => {
	it("should create if path is empty", () => {
		const error = new UnexpectedError(new Error("test"), []);
		assert.equal(error.message, "Unexpected error 'test' (Error)");
	});

	it("should create if path is defined", () => {
		const error = new UnexpectedError(new Error("test"), ["part1", "part2"]);
		assert.equal(error.message, "Unexpected error 'test' (Error) at 'part1.part2'");
	});
});

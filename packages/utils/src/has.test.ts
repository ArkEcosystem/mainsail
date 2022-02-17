import "jest-extended";

import { has } from "./has";

describe("#has", () => {
	it("should return false if the target is not an object", () => {
		expect(has([], "a.b.c")).toBeFalse();
	});

	it("should return false if the path is not a string", () => {
		// @ts-ignore
		expect(has({}, 123)).toBeFalse();
	});

	it("should not do anything if the object is not an object", () => {
		expect(has([], "a.b.c")).toBeFalse();
	});

	it("should work like lodash", () => {
		const object = { a: { b: 2 } };

		expect(has(object, "a")).toBeTrue();
		expect(has(object, "a.b")).toBeTrue();
		expect(has(object, "c")).toBeFalse();
		expect(has({ a: undefined }, "a")).toBeTrue();
	});

	it("should exit early if it encounters a non-object value", () => {
		const object = { a: { b: 2 } };

		expect(has(object, "a.b.c")).toBeFalse();
	});
});

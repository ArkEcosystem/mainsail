import "jest-extended";
import { unset } from "./unset";

describe("#unset", () => {
	it("should return false if the target is not an object", () => {
		expect(unset([], "a.b.c")).toBeFalse();
	});

	it("should return false if the path is not a string", () => {
		// @ts-ignore
		expect(unset({}, 123)).toBeFalse();
	});

	it("should not do anything if the object is not an object", () => {
		expect(unset([], "a.b.c")).toBeFalse();
	});

	it("should work with a string or array as path", () => {
		const object = { a: { b: { c: 7 } } };

		unset(object, "a.b.c");

		expect(object).toEqual({ a: { b: {} } });

		unset(object, "a.b.c");

		expect(object).toEqual({ a: { b: {} } });
	});
});

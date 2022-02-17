import "jest-extended";

import { toString } from "./to-string";

describe("#toString", () => {
	it("should work with a string", () => {
		expect(toString("hi")).toEqual("hi");
	});

	it("should work with a symbol", () => {
		expect(toString(Symbol.for("hi"))).toEqual("Symbol(hi)");
	});

	it("should work with a null value", () => {
		expect(toString(null)).toEqual("");
	});

	it("should work with an undefined value", () => {
		expect(toString(undefined)).toEqual("");
	});

	it("should work with an array", () => {
		expect(toString([1, 2, 3])).toEqual("1,2,3");
	});
});

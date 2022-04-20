import { describe } from "../../core-test-framework";
import { toString } from "./to-string";

describe("toString", async ({ assert, it, nock, loader }) => {
	it("should work with a string", () => {
		assert.is(toString("hi"), "hi");
	});

	it("should work with a symbol", () => {
		assert.is(toString(Symbol.for("hi")), "Symbol(hi)");
	});

	it("should work with a null value", () => {
		assert.is(toString(null), "");
	});

	it("should work with an undefined value", () => {
		assert.is(toString(), "");
	});

	it("should work with an array", () => {
		assert.is(toString([1, 2, 3]), "1,2,3");
	});
});

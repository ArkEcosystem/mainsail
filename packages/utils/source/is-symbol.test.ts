import "jest-extended";

import { isSymbol } from "./is-symbol";

describe("#isSymbol", () => {
	it("should pass", () => {
		expect(isSymbol(Symbol.for("string"))).toBeTrue();
	});

	it("should fail", () => {
		expect(isSymbol("string")).toBeFalse();
	});
});

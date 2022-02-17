import "jest-extended";

import { toUpper } from "./to-upper";

describe("#toUpper", () => {
	it("should turn everything into upper case", () => {
		expect(toUpper("--foo-bar--")).toEqual("--FOO-BAR--");
		expect(toUpper("fooBar")).toEqual("FOOBAR");
		expect(toUpper("__foo_bar__")).toEqual("__FOO_BAR__");
	});
});

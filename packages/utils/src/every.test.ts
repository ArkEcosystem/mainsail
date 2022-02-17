import "jest-extended";

import { every } from "./every";
import { isBoolean } from "./is-boolean";

describe("#every", () => {
	it("should work with a functions", () => {
		expect(every([true, false], isBoolean)).toBeTrue();
		expect(every([true, false, "yes"], isBoolean)).toBeFalse();
	});
});

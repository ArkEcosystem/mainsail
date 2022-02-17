import "jest-extended";

import { numberArray } from "./number-array";

describe("#numberArray", () => {
	it("should contain 5 numbers stating from 0", () => {
		expect(numberArray(5)).toEqual([0, 1, 2, 3, 4]);
	});
});

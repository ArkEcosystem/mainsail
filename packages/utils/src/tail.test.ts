import "jest-extended";

import { tail } from "./tail";

describe("#tail", () => {
	it("should return the array without the first item", () => {
		expect(tail([1, 2, 3, 4, 5])).toEqual([2, 3, 4, 5]);
	});
});

import "jest-extended";

import { unionBy } from "./union-by";

describe("#unionBy", () => {
	it("should work with a function", () => {
		expect(unionBy([2.1], [1.2, 2.3], Math.floor)).toEqual([2.1, 1.2]);
	});
});

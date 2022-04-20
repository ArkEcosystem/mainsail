import { describe } from "../../core-test-framework";
import { flatten } from "./flatten";

describe("#flatten", ({ it, assert }) => {
	it("should return a flattened array", () => {
		assert.equal(flatten([1, [2, 3], [4, [5, [6, 7]]]]), [1, 2, 3, 4, 5, 6, 7]);
		assert.equal(flatten([1, [2, 3], 4, [5, [6, [7], 8], 9], 10]), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
	});
});

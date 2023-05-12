import { describe } from "../../test-framework";
import { concat } from "./concat";

describe("#concat", ({ it, assert }) => {
	it("should concatenate all values", () => {
		assert.equal(concat([1], 2, [3], [[4]]), [1, 2, 3, [4]]);
	});
});

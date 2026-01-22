import { describe } from "@mainsail/test-runner";
import { concat } from "./concat";

describe("#concat", ({ it, assert }) => {
	it("should concatenate all values", () => {
		assert.equal(concat([1], 2, [3], [[4]]), [1, 2, 3, [4]]);
	});
});

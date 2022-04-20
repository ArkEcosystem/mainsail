import { describe } from "../../core-test-framework";
import { unionBy } from "./union-by";

describe("unionBy", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		assert.equal(unionBy([2.1], [1.2, 2.3], Math.floor), [2.1, 1.2]);
	});
});

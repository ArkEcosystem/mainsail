import { describe } from "../../core-test-framework";
import { uniqBy } from "./uniq-by";

describe("uniqBy", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		assert.equal(uniqBy([2.1, 1.2, 2.3], Math.floor), [2.1, 1.2]);
	});
});

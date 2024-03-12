import { describe } from "../../test-framework/source";
import { uniq } from "./uniq";

describe("uniq", async ({ assert, it, nock, loader }) => {
	it("should remove duplicate items", () => {
		assert.equal(uniq([2, 1, 2]), [2, 1]);
	});
});

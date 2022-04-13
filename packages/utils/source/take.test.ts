import { describe } from "../../core-test-framework";

import { take } from "./take";

describe("take", async ({ assert, it, nock, loader }) => {
	it("should take the given number of items", () => {
		assert.equal(take([1, 2, 3]), [1]);
		assert.equal(take([1, 2, 3], 2), [1, 2]);
		assert.equal(take([1, 2, 3], 5), [1, 2, 3]);
		assert.equal(take([1, 2, 3], 0), []);
	});
});

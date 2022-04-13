import { describe } from "../../core-test-framework";

import { tail } from "./tail";

describe("tail", async ({ assert, it, nock, loader }) => {
	it("should return the array without the first item", () => {
		assert.equal(tail([1, 2, 3, 4, 5]), [2, 3, 4, 5]);
	});
});

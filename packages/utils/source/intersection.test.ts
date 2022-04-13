import { describe } from "../../core-test-framework";

import { intersection } from "./intersection";

describe("intersection", async ({ assert, it, nock, loader }) => {
	it("should return the common values", () => {
		assert.equal(intersection([2, 1], [2, 3]), [2]);
		assert.equal(intersection([], []), []);
		assert.equal(intersection(["a"], ["a"]), ["a"]);
		assert.equal(intersection([true], [true]), [true]);
		assert.equal(intersection([false], [false]), [false]);
	});
});

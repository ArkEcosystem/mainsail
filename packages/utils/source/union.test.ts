import { describe } from "../../core-test-framework";
import { union } from "./union";

describe("union", async ({ assert, it, nock, loader }) => {
	it("should work with any value", () => {
		assert.equal(union([2], [1, 2]), [2, 1]);
	});
});

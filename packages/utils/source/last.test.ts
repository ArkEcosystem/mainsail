import { describe } from "../../test-framework/source";
import { last } from "./last";

describe("last", async ({ assert, it, nock, loader }) => {
	it("should return the last item", () => {
		assert.is(last([1, 2, 3, 4, 5]), 5);
	});
});

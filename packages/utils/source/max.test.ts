import { describe } from "../../test-framework";
import { max } from "./max";

describe("max", async ({ assert, it, nock, loader }) => {
	it("should return the largest number", () => {
		assert.is(max([1, 2, 3, 4, 5]), 5);
	});
});

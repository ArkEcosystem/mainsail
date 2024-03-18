import { describe } from "../../test-framework/source";
import { head } from "./head";

describe("head", async ({ assert, it, nock, loader }) => {
	it("should return the first item", () => {
		assert.is(head([1, 2, 3, 4, 5]), 1);
	});
});

import { describe } from "@mainsail/test-runner";
import { head } from "./head";

describe("head", async ({ assert, it, nock, loader }) => {
	it("should return the first item", () => {
		assert.is(head([1, 2, 3, 4, 5]), 1);
	});
});

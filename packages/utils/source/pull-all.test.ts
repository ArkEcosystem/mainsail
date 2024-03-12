import { describe } from "../../test-framework/source";
import { pullAll } from "./pull-all";

describe("pullAll", async ({ assert, it, nock, loader }) => {
	it("should work with a property", () => {
		assert.equal(pullAll(["a", "b", "c", "a", "b", "c"], ["a", "c"]), ["b", "b"]);
	});
});

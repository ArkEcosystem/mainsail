import { describe } from "../../core-test-framework";
import { pull } from "./pull";

describe("pull", async ({ assert, it, nock, loader }) => {
	it("should work with a property", () => {
		assert.equal(pull(["a", "b", "c", "a", "b", "c"], "a", "c"), ["b", "b"]);
	});
});

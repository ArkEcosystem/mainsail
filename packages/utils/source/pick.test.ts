import { describe } from "../../core-test-framework";
import { pick } from "./pick";

describe("pick", async ({ assert, it, nock, loader }) => {
	it("should return an object with only the given properties", () => {
		assert.equal(pick({ a: 1, b: "2", c: 3 }, ["a", "c"]), { a: 1, c: 3 });
	});
});

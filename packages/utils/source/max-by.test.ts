import { describe } from "../../core-test-framework";
import { maxBy } from "./max-by";

describe("maxBy", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		assert.equal(
			maxBy([{ n: 2 }, { n: 3 }, { n: 1 }, { n: 5 }, { n: 4 }], (o) => o.n),
			{ n: 5 },
		);
	});
});

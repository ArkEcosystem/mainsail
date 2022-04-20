import { describe } from "../../core-test-framework";
import { minBy } from "./min-by";

describe("minBy", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		assert.equal(
			minBy([{ n: 2 }, { n: 3 }, { n: 1 }, { n: 5 }, { n: 4 }], (o) => o.n),
			{ n: 1 },
		);
	});
});

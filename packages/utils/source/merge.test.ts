import { describe } from "../../core-test-framework";

import { merge } from "./merge";

describe("merge", async ({ assert, it, nock, loader }) => {
	it("should merge the given objects", () => {
		assert.equal(
			merge(
				{
					a: [{ b: 2 }, { d: 4 }],
				},
				{
					a: [{ c: 3 }, { e: 5 }],
				},
			),
			{ a: [{ b: 2 }, { d: 4 }, { c: 3 }, { e: 5 }] },
		);
	});
});

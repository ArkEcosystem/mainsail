import { describe } from "../../core-test-framework";

import { mapValues } from "./map-values";

describe("mapValues", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		const users = {
			fred: { user: "fred", age: 40 },
			pebbles: { user: "pebbles", age: 1 },
		};

		assert.equal(
			mapValues(users, (o) => o.age),
			{ fred: 40, pebbles: 1 },
		);
	});
});

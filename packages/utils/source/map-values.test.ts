import { describe } from "../../core-test-framework";
import { mapValues } from "./map-values";

describe("mapValues", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		const users = {
			fred: { age: 40, user: "fred" },
			pebbles: { age: 1, user: "pebbles" },
		};

		assert.equal(
			mapValues(users, (o) => o.age),
			{ fred: 40, pebbles: 1 },
		);
	});
});

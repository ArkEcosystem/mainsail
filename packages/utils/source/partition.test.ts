import { describe } from "../../core-test-framework";
import { partition } from "./partition";

describe("partition", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		const users = [
			{ active: false, age: 36, user: "barney" },
			{ active: true, age: 40, user: "fred" },
			{ active: false, age: 1, user: "pebbles" },
		];

		assert.equal(
			partition(users, ({ active }) => active),
			[
				[{ active: true, age: 40, user: "fred" }],
				[
					{ active: false, age: 36, user: "barney" },
					{ active: false, age: 1, user: "pebbles" },
				],
			],
		);
	});
});

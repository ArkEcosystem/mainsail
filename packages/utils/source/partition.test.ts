import { describe } from "../../core-test-framework";

import { partition } from "./partition";

describe("partition", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		const users = [
			{ user: "barney", age: 36, active: false },
			{ user: "fred", age: 40, active: true },
			{ user: "pebbles", age: 1, active: false },
		];

		assert.equal(
			partition(users, ({ active }) => active),
			[
				[{ user: "fred", age: 40, active: true }],
				[
					{ user: "barney", age: 36, active: false },
					{ user: "pebbles", age: 1, active: false },
				],
			],
		);
	});
});

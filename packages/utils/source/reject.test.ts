import { describe } from "../../core-test-framework";

import { reject } from "./reject";

describe("reject", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		const users = [
			{ user: "barney", age: 36, active: false },
			{ user: "fred", age: 40, active: true },
		];

		assert.equal(
			reject(users, (o) => !o.active),
			[{ user: "fred", age: 40, active: true }],
		);
	});
});

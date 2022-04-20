import { describe } from "../../core-test-framework";
import { reject } from "./reject";

describe("reject", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		const users = [
			{ active: false, age: 36, user: "barney" },
			{ active: true, age: 40, user: "fred" },
		];

		assert.equal(
			reject(users, (o) => !o.active),
			[{ active: true, age: 40, user: "fred" }],
		);
	});
});

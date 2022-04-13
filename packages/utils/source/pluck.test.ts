import { describe } from "../../core-test-framework";

import { pluck } from "./pluck";

describe("pluck", async ({ assert, it, nock, loader }) => {
	it("should return the names of the users", () => {
		assert.equal(
			pluck(
				[
					{ user: "barney", age: 36 },
					{ user: "fred", age: 40 },
				],
				"user",
			),
			["barney", "fred"],
		);
		assert.equal(pluck([{ age: 36 }, { age: 40 }], "user"), []);
	});
});

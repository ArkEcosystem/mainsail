import { describe } from "../../core-test-framework";
import { pluck } from "./pluck";

describe("pluck", async ({ assert, it, nock, loader }) => {
	it("should return the names of the users", () => {
		assert.equal(
			pluck(
				[
					{ age: 36, user: "barney" },
					{ age: 40, user: "fred" },
				],
				"user",
			),
			["barney", "fred"],
		);
		assert.equal(pluck([{ age: 36 }, { age: 40 }], "user"), []);
	});
});

import { describe } from "../../core-test-framework";
import { find } from "./find";

describe("#find", ({ it, assert }) => {
	const users = [
		{ active: true, age: 36, user: "barney" },
		{ active: false, age: 40, user: "fred" },
		{ active: true, age: 1, user: "pebbles" },
	];

	it("should work with a function", () => {
		assert.equal(
			find(users, (o) => o.age < 40),
			users[0],
		);

		assert.undefined(find(users, (o) => o.name === "john"));
	});
});

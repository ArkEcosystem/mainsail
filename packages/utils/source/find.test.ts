import { describe } from "../../core-test-framework";

import { find } from "./find";

describe("#find", ({ it, assert }) => {
	const users = [
		{ user: "barney", age: 36, active: true },
		{ user: "fred", age: 40, active: false },
		{ user: "pebbles", age: 1, active: true },
	];

	it("should work with a function", () => {
		assert.equal(
			find(users, (o) => o.age < 40),
			users[0],
		);

		assert.undefined(find(users, (o) => o.name === "john"));
	});
});

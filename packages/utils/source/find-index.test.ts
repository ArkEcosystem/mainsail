import { describe } from "../../core-test-framework";

import { findIndex } from "./find-index";

describe("#findIndex", ({ it, assert }) => {
	it("should work with a function", () => {
		assert.equal(
			findIndex(
				[
					{ user: "barney", active: false },
					{ user: "fred", active: false },
					{ user: "pebbles", active: true },
				],
				(o) => o.user === "fred",
			),
			1,
		);

		assert.equal(
			findIndex(
				[
					{ user: "barney", active: false },
					{ user: "fred", active: false },
					{ user: "pebbles", active: true },
				],
				(o) => o.active,
			),
			2,
		);

		assert.equal(
			findIndex(
				[
					{ user: "barney", active: false },
					{ user: "fred", active: false },
					{ user: "pebbles", active: true },
				],
				(o) => o.user === "john",
			),
			-1,
		);
	});
});

import { describe } from "../../core-test-framework";
import { findIndex } from "./find-index";

describe("#findIndex", ({ it, assert }) => {
	it("should work with a function", () => {
		assert.equal(
			findIndex(
				[
					{ active: false, user: "barney" },
					{ active: false, user: "fred" },
					{ active: true, user: "pebbles" },
				],
				(o) => o.user === "fred",
			),
			1,
		);

		assert.equal(
			findIndex(
				[
					{ active: false, user: "barney" },
					{ active: false, user: "fred" },
					{ active: true, user: "pebbles" },
				],
				(o) => o.active,
			),
			2,
		);

		assert.equal(
			findIndex(
				[
					{ active: false, user: "barney" },
					{ active: false, user: "fred" },
					{ active: true, user: "pebbles" },
				],
				(o) => o.user === "john",
			),
			-1,
		);
	});
});

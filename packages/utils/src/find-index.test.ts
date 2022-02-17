import { findIndex } from "./find-index";

describe("#findIndex", () => {
	it("should work with a function", () => {
		expect(
			findIndex(
				[
					{ user: "barney", active: false },
					{ user: "fred", active: false },
					{ user: "pebbles", active: true },
				],
				(o) => o.user === "fred",
			),
		).toBe(1);

		expect(
			findIndex(
				[
					{ user: "barney", active: false },
					{ user: "fred", active: false },
					{ user: "pebbles", active: true },
				],
				(o) => o.active,
			),
		).toBe(2);

		expect(
			findIndex(
				[
					{ user: "barney", active: false },
					{ user: "fred", active: false },
					{ user: "pebbles", active: true },
				],
				(o) => o.user === "john",
			),
		).toBe(-1);
	});
});

import { describe } from "../../../core-test-framework";

import { sortBy } from "./sort-by";

const dummies = [
	{ name: "John", age: 30 },
	{ name: "Jane", age: 40 },
	{ name: "Andrew", age: 18 },
	{ name: "Bob", age: 18 },
];

describe("#sortBy", ({ it, assert }) => {
	it("should sort records without iteratees", () => {
		assert.equal(sortBy(dummies), [
			{ name: "John", age: 30 },
			{ name: "Jane", age: 40 },
			{ name: "Andrew", age: 18 },
			{ name: "Bob", age: 18 },
		]);
	});

	it("should sort records by string", () => {
		assert.equal(sortBy(dummies, "age"), [
			{ name: "Andrew", age: 18 },
			{ name: "Bob", age: 18 },
			{ name: "John", age: 30 },
			{ name: "Jane", age: 40 },
		]);
	});

	it("should sort records by array", () => {
		assert.equal(sortBy(dummies, ["age"]), [
			{ name: "Andrew", age: 18 },
			{ name: "Bob", age: 18 },
			{ name: "John", age: 30 },
			{ name: "Jane", age: 40 },
		]);
	});
});

import { describe } from "../../../core-test-framework";
import { sortBy } from "./sort-by";

const dummies = [
	{ age: 30, name: "John" },
	{ age: 40, name: "Jane" },
	{ age: 18, name: "Andrew" },
	{ age: 18, name: "Bob" },
];

describe("#sortBy", ({ it, assert }) => {
	it("should sort records without iteratees", () => {
		assert.equal(sortBy(dummies), [
			{ age: 30, name: "John" },
			{ age: 40, name: "Jane" },
			{ age: 18, name: "Andrew" },
			{ age: 18, name: "Bob" },
		]);
	});

	it("should sort records by string", () => {
		assert.equal(sortBy(dummies, "age"), [
			{ age: 18, name: "Andrew" },
			{ age: 18, name: "Bob" },
			{ age: 30, name: "John" },
			{ age: 40, name: "Jane" },
		]);
	});

	it("should sort records by array", () => {
		assert.equal(sortBy(dummies, ["age"]), [
			{ age: 18, name: "Andrew" },
			{ age: 18, name: "Bob" },
			{ age: 30, name: "John" },
			{ age: 40, name: "Jane" },
		]);
	});
});

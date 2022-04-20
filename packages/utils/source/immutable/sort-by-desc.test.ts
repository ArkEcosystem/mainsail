import { describe } from "../../../core-test-framework";
import { sortByDesc } from "./sort-by-desc";

const dummies = [
	{ age: 18, name: "Andrew" },
	{ age: 18, name: "Bob" },
	{ age: 30, name: "John" },
	{ age: 40, name: "Jane" },
];

describe("#sortByDesc", ({ it, assert }) => {
	it("should sort records without iteratees", () => {
		assert.equal(sortByDesc(dummies), [
			{ age: 40, name: "Jane" },
			{ age: 30, name: "John" },
			{ age: 18, name: "Bob" },
			{ age: 18, name: "Andrew" },
		]);
	});

	it("should sort records by string", () => {
		assert.equal(sortByDesc(dummies, "age"), [
			{ age: 40, name: "Jane" },
			{ age: 30, name: "John" },
			{ age: 18, name: "Andrew" },
			{ age: 18, name: "Bob" },
		]);
	});

	it("should sort records by array", () => {
		assert.equal(sortByDesc(dummies, ["age"]), [
			{ age: 40, name: "Jane" },
			{ age: 30, name: "John" },
			{ age: 18, name: "Andrew" },
			{ age: 18, name: "Bob" },
		]);
	});
});

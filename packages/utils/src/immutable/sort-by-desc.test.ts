import { sortByDesc } from "./sort-by-desc";

const dummies = [
	{ name: "Andrew", age: 18 },
	{ name: "Bob", age: 18 },
	{ name: "John", age: 30 },
	{ name: "Jane", age: 40 },
];

describe("#sortByDesc", () => {
	it("should sort records without iteratees", () => {
		expect(sortByDesc(dummies)).toEqual([
			{ name: "Jane", age: 40 },
			{ name: "John", age: 30 },
			{ name: "Bob", age: 18 },
			{ name: "Andrew", age: 18 },
		]);
	});

	it("should sort records by string", () => {
		expect(sortByDesc(dummies, "age")).toEqual([
			{ name: "Jane", age: 40 },
			{ name: "John", age: 30 },
			{ name: "Andrew", age: 18 },
			{ name: "Bob", age: 18 },
		]);
	});

	it("should sort records by array", () => {
		expect(sortByDesc(dummies, ["age"])).toEqual([
			{ name: "Jane", age: 40 },
			{ name: "John", age: 30 },
			{ name: "Andrew", age: 18 },
			{ name: "Bob", age: 18 },
		]);
	});
});

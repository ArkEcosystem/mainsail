import { describeWithContext } from "../../core-test-framework";
import { sortByDesc } from "./sort-by-desc";

describeWithContext(
	"sortByDesc",
	() => ({
		dummies: [
			{ age: 18, name: "Andrew" },
			{ age: 18, name: "Bob" },
			{ age: 30, name: "John" },
			{ age: 40, name: "Jane" },
		],
	}),
	({ assert, it, nock, loader }) => {
		it("should sort records without iteratees", (context) => {
			assert.equal(sortByDesc([...context.dummies]), [
				{ age: 40, name: "Jane" },
				{ age: 30, name: "John" },
				{ age: 18, name: "Bob" },
				{ age: 18, name: "Andrew" },
			]);
		});

		it("should sort records by string", (context) => {
			assert.equal(sortByDesc([...context.dummies], "age"), [
				{ age: 40, name: "Jane" },
				{ age: 30, name: "John" },
				{ age: 18, name: "Andrew" },
				{ age: 18, name: "Bob" },
			]);
		});

		it("should sort records by array", (context) => {
			assert.equal(sortByDesc([...context.dummies], ["age"]), [
				{ age: 40, name: "Jane" },
				{ age: 30, name: "John" },
				{ age: 18, name: "Andrew" },
				{ age: 18, name: "Bob" },
			]);
		});
	},
);

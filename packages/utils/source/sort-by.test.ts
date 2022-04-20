import { describeWithContext } from "../../core-test-framework";
import { sortBy } from "./sort-by";

describeWithContext(
	"sortBy",
	() => ({
		dummies: [
			{ age: 30, name: "John" },
			{ age: 40, name: "Jane" },
			{ age: 18, name: "Andrew" },
			{ age: 18, name: "Bob" },
		],
	}),
	({ assert, it, nock, loader }) => {
		it("should sort records without iteratees", (context) => {
			assert.equal(sortBy([...context.dummies]), [
				{ age: 30, name: "John" },
				{ age: 40, name: "Jane" },
				{ age: 18, name: "Andrew" },
				{ age: 18, name: "Bob" },
			]);
		});

		it("should sort records by string", (context) => {
			assert.equal(sortBy([...context.dummies], "age"), [
				{ age: 18, name: "Andrew" },
				{ age: 18, name: "Bob" },
				{ age: 30, name: "John" },
				{ age: 40, name: "Jane" },
			]);
		});

		it("should sort records by array", (context) => {
			assert.equal(sortBy([...context.dummies], ["age"]), [
				{ age: 18, name: "Andrew" },
				{ age: 18, name: "Bob" },
				{ age: 30, name: "John" },
				{ age: 40, name: "Jane" },
			]);
		});
	},
);

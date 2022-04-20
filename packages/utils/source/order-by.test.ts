import { describeWithContext } from "../../core-test-framework";
import { orderBy } from "./order-by";

describeWithContext(
	"orderBy",
	() => ({
		dummies: [
			{ age: 18, name: "Andrew" },
			{ age: 18, name: "Bob" },
			{ age: 30, name: "John" },
			{ age: 40, name: "Jane" },
		],
	}),
	({ assert, it, nock, loader }) => {
		it("should sort records by youngest age (with string params)", (context) => {
			assert.equal(orderBy([...context.dummies], "age", "asc"), [
				{ age: 18, name: "Andrew" },
				{ age: 18, name: "Bob" },
				{ age: 30, name: "John" },
				{ age: 40, name: "Jane" },
			]);
		});

		it("should sort records by youngest age (with function params)", (context) => {
			assert.equal(
				orderBy([...context.dummies], (value) => value.age, "asc"),
				[
					{ age: 18, name: "Andrew" },
					{ age: 18, name: "Bob" },
					{ age: 30, name: "John" },
					{ age: 40, name: "Jane" },
				],
			);
		});

		it("should sort records by oldest age (with string params)", (context) => {
			assert.equal(orderBy([...context.dummies], "age", "desc"), [
				{ age: 40, name: "Jane" },
				{ age: 30, name: "John" },
				{ age: 18, name: "Andrew" },
				{ age: 18, name: "Bob" },
			]);
		});

		it("should sort records by oldest age (with function params)", (context) => {
			assert.equal(
				orderBy([...context.dummies], (value) => value.age, "desc"),
				[
					{ age: 40, name: "Jane" },
					{ age: 30, name: "John" },
					{ age: 18, name: "Andrew" },
					{ age: 18, name: "Bob" },
				],
			);
		});

		it("should sort records by youngest age (with array params)", (context) => {
			assert.equal(orderBy([...context.dummies], ["name", "age"], ["asc", "asc"]), [
				{ age: 18, name: "Andrew" },
				{ age: 18, name: "Bob" },
				{ age: 40, name: "Jane" },
				{ age: 30, name: "John" },
			]);
		});

		it("should sort records by oldest age (with array params)", (context) => {
			assert.equal(orderBy([...context.dummies], ["name", "age"], ["asc", "desc"]), [
				{ age: 18, name: "Andrew" },
				{ age: 18, name: "Bob" },
				{ age: 40, name: "Jane" },
				{ age: 30, name: "John" },
			]);
		});
	},
);

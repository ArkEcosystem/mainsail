import { describeWithContext } from "../../core-test-framework";

import { orderBy } from "./order-by";

describeWithContext(
	"orderBy",
	() => ({
		dummies: [
			{ name: "Andrew", age: 18 },
			{ name: "Bob", age: 18 },
			{ name: "John", age: 30 },
			{ name: "Jane", age: 40 },
		],
	}),
	({ assert, it, nock, loader }) => {
		it("should sort records by youngest age (with string params)", (context) => {
			assert.equal(orderBy([...context.dummies], "age", "asc"), [
				{ name: "Andrew", age: 18 },
				{ name: "Bob", age: 18 },
				{ name: "John", age: 30 },
				{ name: "Jane", age: 40 },
			]);
		});

		it("should sort records by youngest age (with function params)", (context) => {
			assert.equal(
				orderBy([...context.dummies], (value) => value.age, "asc"),
				[
					{ name: "Andrew", age: 18 },
					{ name: "Bob", age: 18 },
					{ name: "John", age: 30 },
					{ name: "Jane", age: 40 },
				],
			);
		});

		it("should sort records by oldest age (with string params)", (context) => {
			assert.equal(orderBy([...context.dummies], "age", "desc"), [
				{ name: "Jane", age: 40 },
				{ name: "John", age: 30 },
				{ name: "Andrew", age: 18 },
				{ name: "Bob", age: 18 },
			]);
		});

		it("should sort records by oldest age (with function params)", (context) => {
			assert.equal(
				orderBy([...context.dummies], (value) => value.age, "desc"),
				[
					{ name: "Jane", age: 40 },
					{ name: "John", age: 30 },
					{ name: "Andrew", age: 18 },
					{ name: "Bob", age: 18 },
				],
			);
		});

		it("should sort records by youngest age (with array params)", (context) => {
			assert.equal(orderBy([...context.dummies], ["name", "age"], ["asc", "asc"]), [
				{ name: "Andrew", age: 18 },
				{ name: "Bob", age: 18 },
				{ name: "Jane", age: 40 },
				{ name: "John", age: 30 },
			]);
		});

		it("should sort records by oldest age (with array params)", (context) => {
			assert.equal(orderBy([...context.dummies], ["name", "age"], ["asc", "desc"]), [
				{ name: "Andrew", age: 18 },
				{ name: "Bob", age: 18 },
				{ name: "Jane", age: 40 },
				{ name: "John", age: 30 },
			]);
		});
	},
);

import { BigNumber } from "@arkecosystem/utils";

import { describe } from "./describe";

describe("assert", ({ assert, it, schema }) => {
	it("determines if two values are equal", () => {
		assert.equal("hello", "hello");
		assert.equal(5, 5);
		assert.equal(true, true);

		// Not...
		assert.not.equal("hello", "world");
		assert.not.equal(5, 6);
		assert.not.equal(true, false);
	});

	it("determines if a value is defined or undefined", () => {
		assert.undefined();
		assert.defined({});

		// Not...
		assert.not.undefined({});
		assert.not.defined();
	});

	it("determines if two numbers are equal", () => {
		assert.equal(BigNumber.make(10), BigNumber.make(10));

		assert.not.equal(BigNumber.make(10), BigNumber.make(15));
	});

	it("does match the given object", () => {
		assert.matchesObject(
			{
				hello: "world",
			},
			{
				hello: schema.string(),
			},
		);
	});

	it("does not match the given object", () => {
		assert.not.matchesObject(
			{
				hello: 1,
			},
			{
				hello: schema.string(),
			},
		);
	});

	it("creates a snapshot", () => {
		assert.snapshot("object", { hello: "world" });
		assert.snapshot("number", 1);
		assert.snapshot("hello", "hello");
		assert.snapshot("true", true);
		assert.snapshot("false", false);
		assert.snapshot("nan", Number.NaN);
	});
});

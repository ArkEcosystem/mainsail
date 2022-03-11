import { describe } from "../../../../core-test-framework";

import { AttributeSet } from "./attribute-set";

describe<{
	set: AttributeSet;
}>("AttributeSet", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.set = new AttributeSet();
	});

	it("should all return all attributes", (context) => {
		context.set.set("someAttribute1");
		context.set.set("someAttribute2");

		assert.equal(context.set.all(), ["someAttribute1", "someAttribute2"]);
	});

	it("should set and forget an attribute", (context) => {
		context.set.set("someAttribute");

		assert.true(context.set.has("someAttribute"));

		assert.true(context.set.forget("someAttribute"));

		assert.false(context.set.has("someAttribute"));
	});

	it("should set and forget multiple attributes", (context) => {
		context.set.set("someAttribute1");
		context.set.set("someAttribute2");

		assert.true(context.set.has("someAttribute1"));
		assert.true(context.set.has("someAttribute2"));

		assert.true(context.set.flush());

		assert.false(context.set.has("someAttribute1"));
		assert.false(context.set.has("someAttribute2"));
	});

	it("should throw if a duplicate attribute is tried to be set", (context) => {
		context.set.set("someAttribute");

		assert.rejects(() => context.set.set("someAttribute"), "Duplicated attribute: someAttribute");
	});

	it("should throw if an unknown attribute is tried to be forgotten", (context) => {
		assert.rejects(() => context.set.forget("someAttribute"), "Unknown attribute: someAttribute");
	});
});

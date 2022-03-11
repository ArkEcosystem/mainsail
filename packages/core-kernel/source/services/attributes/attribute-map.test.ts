import { describe } from "../../../../core-test-framework";

import { AttributeMap } from "./attribute-map";
import { AttributeSet } from "./attribute-set";

describe("AttributeMap", ({ assert, it }) => {
	it("should get all attribute", () => {
		const set: AttributeSet = new AttributeSet();
		set.set("someAttribute");

		const map: AttributeMap = new AttributeMap(set);
		map.set("someAttribute", "value");

		assert.equal(map.all(), { someAttribute: "value" });
	});

	it("should get the given attribute", () => {
		const set: AttributeSet = new AttributeSet();
		set.set("someAttribute");

		const map: AttributeMap = new AttributeMap(set);
		map.set("someAttribute", "value");

		assert.is(map.get("someAttribute"), "value");
	});

	it("should set nested attributes", () => {
		const set: AttributeSet = new AttributeSet();
		set.set("collection");
		set.set("collection.key1");
		set.set("collection.key2");
		set.set("collection.key3");

		const map: AttributeMap = new AttributeMap(set);
		map.set("collection", {});
		map.set("collection.key1", "value1");
		map.set("collection.key2", "value2");
		map.set("collection.key3", "value3");

		assert.equal(map.get("collection"), {
			key1: "value1",
			key2: "value2",
			key3: "value3",
		});
		assert.is(map.get("collection.key1"), "value1");
		assert.is(map.get("collection.key2"), "value2");
		assert.is(map.get("collection.key3"), "value3");
	});

	it("should forget the given attribute", () => {
		const set: AttributeSet = new AttributeSet();
		set.set("someAttribute");

		const map: AttributeMap = new AttributeMap(set);
		map.set("someAttribute", "value");

		assert.true(map.has("someAttribute"));

		map.forget("someAttribute");

		assert.false(map.has("someAttribute"));
	});

	it("should forget all attributes", () => {
		const set: AttributeSet = new AttributeSet();
		set.set("someAttribute");

		const map: AttributeMap = new AttributeMap(set);
		assert.false(map.has("someAttribute"));

		map.set("someAttribute", "value");

		assert.true(map.has("someAttribute"));

		map.flush();

		assert.false(map.has("someAttribute"));
	});

	it("should throw if an an unknown attribute is tried to be retrieved", () => {
		const map: AttributeMap = new AttributeMap(new AttributeSet());

		assert.rejects(() => map.get("someAttribute"), "Unknown attribute: someAttribute");
	});

	it("should throw if an an unknown attribute is tried to be set", () => {
		const map: AttributeMap = new AttributeMap(new AttributeSet());

		assert.rejects(() => map.set("someAttribute", "value"), "Unknown attribute: someAttribute");
	});

	it("should throw if an an unknown attribute is tried to be forgotten", () => {
		const map: AttributeMap = new AttributeMap(new AttributeSet());

		assert.rejects(() => map.forget("someAttribute"), "Unknown attribute: someAttribute");
	});

	it("should throw if an an unknown attribute is tried to be checked", () => {
		const map: AttributeMap = new AttributeMap(new AttributeSet());

		assert.rejects(() => map.has("someAttribute"), "Unknown attribute: someAttribute");
	});
});

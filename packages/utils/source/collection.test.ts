import { describe } from "../../core-test-framework";

import { Collection } from "./collection";

describe<{
	collection: Collection<string>;
}>("Collection", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.collection = new Collection<string>();
		context.collection.set("key", "value");
	});

	it("#all - should return the underlying collection", ({ collection }) => {
		assert.equal(collection.all(), { key: "value" });
	});

	it("#entries - should return all entries", ({ collection }) => {
		assert.equal(collection.entries(), [["key", "value"]]);
	});

	it("#keys - should return all keys", ({ collection }) => {
		assert.equal(collection.keys(), ["key"]);
	});

	it("#values - should return all values", ({ collection }) => {
		assert.equal(collection.values(), ["value"]);
	});

	it("#pull - should get an item and remove it", ({ collection }) => {
		assert.equal(collection.pull("key"), "value");

		assert.true(collection.isEmpty());
	});

	it("#get - should get an item", ({ collection }) => {
		assert.equal(collection.get("key"), "value");
	});
	it("#has - should return true", ({ collection }) => {
		assert.true(collection.has("key"));
	});

	it("#forget - should forget an item", ({ collection }) => {
		assert.false(collection.isEmpty());

		collection.forget("key");

		assert.true(collection.isEmpty());
	});

	it("#flush - should flush all items", ({ collection }) => {
		assert.false(collection.isEmpty());

		collection.flush();

		assert.true(collection.isEmpty());
	});

	it("#has - should return true if an item exists", ({ collection }) => {
		assert.true(collection.has("key"));
	});

	it("#has - should return false if an item doesn't exist", ({ collection }) => {
		collection.flush();

		assert.false(collection.has("key"));
	});

	it("#missing - should return false if an item isn't missing", ({ collection }) => {
		assert.false(collection.missing("key"));
	});

	it("#missing - should return true if an item is missing", ({ collection }) => {
		collection.flush();

		assert.true(collection.missing("key"));
	});

	it("#count - should count all items", ({ collection }) => {
		assert.equal(collection.count(), 1);
	});

	it("#isEmpty - should return false if there are items", ({ collection }) => {
		assert.false(collection.isEmpty());
	});

	it("#isEmpty - should return true if there are no items", ({ collection }) => {
		collection.flush();

		assert.true(collection.isEmpty());
	});

	it("#isNotEmpty - should return true if there are items", ({ collection }) => {
		assert.true(collection.isNotEmpty());
	});

	it("#isNotEmpty - should return false if there are no items", ({ collection }) => {
		collection.flush();

		assert.false(collection.isNotEmpty());
	});

	it("#random - should return a random item", ({ collection }) => {
		assert.equal(collection.random(), "value");
	});

	it("#toJson - should turn the items into JSON", ({ collection }) => {
		assert.equal(collection.toJson(), JSON.stringify({ ["key"]: "value" }));
	});
});

import "jest-extended";

import { Collection } from "./collection";

let collection: Collection<string>;

beforeEach(() => {
	collection = new Collection<string>();
	collection.set("key", "value");
});

describe("Collection", () => {
	it("should return the underlying collection", () => {
		expect(collection.all()).toEqual({ key: "value" });
	});

	it("should return all entries", () => {
		expect(collection.entries()).toEqual([["key", "value"]]);
	});

	it("should return all keys", () => {
		expect(collection.keys()).toEqual(["key"]);
	});

	it("should return all values", () => {
		expect(collection.values()).toEqual(["value"]);
	});

	it("should get an item and remove it", () => {
		expect(collection.pull("key")).toEqual("value");

		expect(collection.isEmpty()).toBeTrue();
	});

	it("should get an item", () => {
		expect(collection.get("key")).toEqual("value");
	});
	it("should set an item", () => {
		expect(collection.has("key")).toBeTrue();
	});

	it("should forget an item", () => {
		expect(collection.isEmpty()).toBeFalse();

		collection.forget("key");

		expect(collection.isEmpty()).toBeTrue();
	});

	it("should flush all items", () => {
		expect(collection.isEmpty()).toBeFalse();

		collection.flush();

		expect(collection.isEmpty()).toBeTrue();
	});

	describe("has", () => {
		it("should return true if an item exists", () => {
			expect(collection.has("key")).toBeTrue();
		});

		it("should return false if an item doesn't exist", () => {
			collection.flush();

			expect(collection.has("key")).toBeFalse();
		});
	});

	describe("missing", () => {
		it("should return false if an item isn't missing", () => {
			expect(collection.missing("key")).toBeFalse();
		});

		it("should return true if an item is missing", () => {
			collection.flush();

			expect(collection.missing("key")).toBeTrue();
		});
	});

	it("should count all items", () => {
		expect(collection.count()).toBe(1);
	});

	describe("isEmpty", () => {
		it("should return false if there are items", () => {
			expect(collection.isEmpty()).toBeFalse();
		});

		it("should return true if there are no items", () => {
			collection.flush();

			expect(collection.isEmpty()).toBeTrue();
		});
	});

	describe("isNotEmpty", () => {
		it("should return true if there are items", () => {
			expect(collection.isNotEmpty()).toBeTrue();
		});

		it("should return false if there are no items", () => {
			collection.flush();

			expect(collection.isNotEmpty()).toBeFalse();
		});
	});

	it("should return a random item", () => {
		expect(collection.random()).toEqual("value");
	});

	it("should turn the items into JSON", () => {
		expect(collection.toJson()).toEqual(JSON.stringify({ ["key"]: "value" }));
	});
});

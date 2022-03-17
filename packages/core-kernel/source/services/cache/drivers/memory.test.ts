import { Container } from "@arkecosystem/core-container";
import { Exceptions, Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../../core-test-framework";
import { Application } from "../../../application";
import { MemoryEventDispatcher } from "../../events";
import { MemoryCacheStore } from "./memory";

const items: Record<string, number> = {
	"1": 1,
	"2": 2,
	"3": 3,
	"4": 4,
	"5": 5,
};

const itemsBool: boolean[] = Array.from<boolean>({ length: 5 }).fill(true);
const itemsTruthy: boolean[] = Array.from<boolean>({ length: 5 }).fill(true);
const itemsFalsey: boolean[] = Array.from<boolean>({ length: 5 }).fill(false);

describe<{
	app: Application;
	store: MemoryCacheStore<string, number>;
}>("MemoryCacheStore", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());

		context.app.bind(Identifiers.EventDispatcherService).to(MemoryEventDispatcher).inSingletonScope();

		context.store = context.app.resolve(MemoryCacheStore);
	});

	it("should make a new instance", async (context) => {
		assert.instance(await context.store.make(), MemoryCacheStore);
	});

	it("should get all of the items in the store", async (context) => {
		await context.store.putMany(Object.entries(items));

		assert.equal(await context.store.all(), Object.entries(items));
	});

	it("should get the keys of the store items", async (context) => {
		await context.store.putMany(Object.entries(items));

		assert.equal(await context.store.keys(), Object.keys(items));
	});

	it("should get the values of the store items", async (context) => {
		await context.store.putMany(Object.entries(items));

		assert.equal(await context.store.values(), Object.values(items));
	});

	it("should get an item from the store", async (context) => {
		await context.store.put("1", 1);

		assert.is(await context.store.get("1"), 1);
	});

	it("should return undefined when getting missing item from the store", async (context) => {
		assert.is(await context.store.get("1"), undefined);
	});

	it("should get many items from the store", async (context) => {
		await context.store.putMany(Object.entries(items));

		assert.equal(await context.store.getMany(Object.keys(items)), Object.values(items));
	});

	it("should put an item into the store", async (context) => {
		assert.true(await context.store.put("1", 1));
	});

	it("should put many items into the store", async (context) => {
		assert.equal(await context.store.putMany(Object.entries(items)), itemsBool);
	});

	it("should check if the given key exists in the store", async (context) => {
		assert.false(await context.store.has("1"));

		await context.store.put("1", 1);

		assert.true(await context.store.has("1"));
	});

	it("should check if the given keys exists in the store", async (context) => {
		assert.equal(await context.store.hasMany(Object.keys(items)), itemsFalsey);

		await context.store.putMany(Object.entries(items));

		assert.equal(await context.store.hasMany(Object.keys(items)), itemsTruthy);
	});

	it("should check if the given key is missing from the store", async (context) => {
		assert.true(await context.store.missing("1"));

		await context.store.put("1", 1);

		assert.false(await context.store.missing("1"));
	});

	it("should check if the given keys is missing from the store", async (context) => {
		assert.equal(await context.store.missingMany(Object.keys(items)), itemsTruthy);

		await context.store.putMany(Object.entries(items));

		assert.equal(await context.store.missingMany(Object.keys(items)), itemsFalsey);
	});

	it("should throw if the [forever] method is not implemented", async (context) => {
		await assert.rejects(() => context.store.forever("1", 1), Exceptions.NotImplemented, "forever");
	});

	it("should throw if the [foreverMany] method is not implemented", async (context) => {
		await assert.rejects(
			() => context.store.foreverMany(Object.entries(items)),
			Exceptions.NotImplemented,
			"foreverMany",
		);
	});

	it("should remove an item from the store", async (context) => {
		await context.store.put("1", 1);

		assert.true(await context.store.forget("1"));
	});

	it("should remove many items from the store", async (context) => {
		await context.store.putMany(Object.entries(items));

		assert.equal(await context.store.forgetMany(Object.keys(items)), itemsBool);
	});

	it("should remove all items from the store", async (context) => {
		await context.store.putMany(Object.entries(items));

		assert.true(await context.store.flush());
	});

	it("should throw if the [getPrefix] method is not implemented", async (context) => {
		await assert.rejects(() => context.store.getPrefix(), Exceptions.NotImplemented, "getPrefix");
	});
});

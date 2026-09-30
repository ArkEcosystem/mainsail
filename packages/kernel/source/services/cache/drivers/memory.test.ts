import { Events, Identifiers } from "@mainsail/constants";
import * as Exceptions from "@mainsail/exceptions";

import { describe } from "@mainsail/test-runner";
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
}>("MemoryCacheStore", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.Services.EventDispatcher.Service).to(MemoryEventDispatcher).inSingletonScope();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ warn: () => {} });

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

	it("should dispatch a hit (not a miss) for a falsy cached value", async (context) => {
		const dispatcher = context.app.get<MemoryEventDispatcher>(Identifiers.Services.EventDispatcher.Service);
		const dispatchSpy = spy(dispatcher, "dispatch");

		await context.store.put("zero", 0);

		assert.is(await context.store.get("zero"), 0);

		dispatchSpy.calledWith(Events.CacheEvent.Hit, { key: "zero", value: 0 });
		dispatchSpy.notCalledWith(Events.CacheEvent.Missed, { key: "zero" });
	});

	it("should dispatch a miss for a key that is absent", async (context) => {
		const dispatcher = context.app.get<MemoryEventDispatcher>(Identifiers.Services.EventDispatcher.Service);
		const dispatchSpy = spy(dispatcher, "dispatch");

		assert.is(await context.store.get("absent"), undefined);

		dispatchSpy.calledWith(Events.CacheEvent.Missed, { key: "absent" });
	});

	it("should not surface an unhandled rejection when the event dispatcher rejects", async (context) => {
		const dispatcher = context.app.get<MemoryEventDispatcher>(Identifiers.Services.EventDispatcher.Service);
		stub(dispatcher, "dispatch").rejectedValue(new Error("dispatch boom"));

		const unhandled: unknown[] = [];
		const onUnhandled = (reason: unknown) => unhandled.push(reason);
		process.on("unhandledRejection", onUnhandled);

		try {
			// None of these must reject even though every dispatch rejects.
			await assert.resolves(() => context.store.put("1", 1));
			await assert.resolves(() => context.store.get("1"));
			await assert.resolves(() => context.store.forget("1"));
			await assert.resolves(() => context.store.flush());

			// Allow the microtask/timer queue to flush so any unhandled rejection would surface.
			await new Promise((resolve) => setTimeout(resolve, 20));
		} finally {
			process.off("unhandledRejection", onUnhandled);
		}

		assert.equal(unhandled, []);
	});

	it("should log a warning when an event dispatch rejects", async (context) => {
		const dispatcher = context.app.get<MemoryEventDispatcher>(Identifiers.Services.EventDispatcher.Service);
		stub(dispatcher, "dispatch").rejectedValue(new Error("dispatch boom"));

		const logger = context.app.get<{ warn: () => void }>(Identifiers.Services.Log.Service);
		const warnSpy = spy(logger, "warn");

		await context.store.put("1", 1);

		// The dispatch rejection is handled in a microtask; let it settle.
		await new Promise((resolve) => setTimeout(resolve, 20));

		warnSpy.called();
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

import { describe } from "../../../../../core-test-framework";

import { NullEventDispatcher } from "./null";
import { EventListener, EventName } from "../../../contracts/kernel";

class MyEventListener implements EventListener {
	public handle(payload: { name: EventName; data: any }): void {}
}

describe("NullEventDispatcher", ({ assert, it }) => {
	it("should return function", () => {
		const driver = new NullEventDispatcher();
		const result = driver.listen("event", new MyEventListener());
		assert.is(typeof result, "function");
	});

	it("should return map of functions", () => {
		const driver = new NullEventDispatcher();
		const result = driver.listenMany([
			["event1", new MyEventListener()],
			["event2", new MyEventListener()],
		]);
		assert.equal(Array.from(result.keys()), ["event1", "event2"]);
		assert.is(typeof result.get("event1"), "function");
		assert.is(typeof result.get("event2"), "function");
	});

	it("should return undefined", () => {
		const driver = new NullEventDispatcher();
		const result = driver.listenOnce("event", new MyEventListener());
		assert.is(result, undefined);
	});

	it("should return undefined", () => {
		const driver = new NullEventDispatcher();
		const result = driver.forget("event");
		assert.is(result, undefined);
	});

	it("should return undefined", () => {
		const driver = new NullEventDispatcher();
		const result = driver.forgetMany(["event1", "event2"]);
		assert.is(result, undefined);
	});

	it("should return undefined", () => {
		const driver = new NullEventDispatcher();
		const result = driver.flush();
		assert.is(result, undefined);
	});

	it("should return empty array", () => {
		const driver = new NullEventDispatcher();
		const result = driver.getListeners();
		assert.equal(result, []);
	});

	it("should return false", () => {
		const driver = new NullEventDispatcher();
		const result = driver.hasListeners("event");
		assert.is(result, false);
	});

	it("should return 0", () => {
		const driver = new NullEventDispatcher();
		const result = driver.countListeners("event");
		assert.is(result, 0);
	});

	it("should return undefined", async () => {
		const driver = new NullEventDispatcher();
		const result = await driver.dispatch("event", "data");
		assert.is(result, undefined);
	});

	it("should return undefined", async () => {
		const driver = new NullEventDispatcher();
		const result = await driver.dispatchSeq("event", "data");
		assert.is(result, undefined);
	});

	it("should return undefined", () => {
		const driver = new NullEventDispatcher();
		const result = driver.dispatchSync("event", "data");
		assert.is(result, undefined);
	});

	it("should return undefined", async () => {
		const driver = new NullEventDispatcher();
		const result = await driver.dispatchMany([
			["event1", "data1"],
			["event2", "data2"],
		]);
		assert.is(result, undefined);
	});

	it("should return undefined", () => {
		const driver = new NullEventDispatcher();
		const result = driver.dispatchManySync([
			["event1", "data1"],
			["event2", "data2"],
		]);
		assert.is(result, undefined);
	});
});

import { Contracts } from "@arkecosystem/core-contracts";

import { describe } from "../../../../../core-test-framework";
import { MemoryEventDispatcher } from "./memory";

class DummyClass implements Contracts.Kernel.EventListener {
	public constructor(private readonly method?) {}

	public handle(): void {
		this.method();
	}
}

describe<{
	emitter: MemoryEventDispatcher;
	dummyCaller: any;
	dummyCallerSpy: any;
	dummyListener: any;
}>("MemoryEventDispatcher", ({ assert, beforeEach, it, spy, spyFn }) => {
	beforeEach((context) => {
		context.emitter = new MemoryEventDispatcher();
		context.dummyCaller = () => {};
		context.dummyCallerSpy = spy(context, "dummyCaller");
		context.dummyListener = new DummyClass(context.dummyCaller);
	});

	it("should add an event listener", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));

		await context.emitter.dispatch("firstEvent");

		context.dummyCallerSpy.calledTimes(2);
	});

	it("should return an unsubcribe method for an event listener", async (context) => {
		const off = context.emitter.listen("firstEvent", context.dummyListener);
		await context.emitter.dispatch("firstEvent");
		context.dummyCallerSpy.calledOnce();

		off();
		await context.emitter.dispatch("firstEvent");
		context.dummyCallerSpy.calledOnce();
	});

	it("should prevent duplicate listeners", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("firstEvent", context.dummyListener);

		await context.emitter.dispatch("firstEvent");

		context.dummyCallerSpy.calledOnce();
	});

	it("should add a wildcard listener", async (context) => {
		context.emitter.listen("*", context.dummyListener);

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatchSeq("firstEvent");

		context.dummyCallerSpy.calledTimes(2);
	});

	it("should add many event listeners", async (context) => {
		context.emitter.listenMany([
			["firstEvent", context.dummyListener],
			["firstEvent", new DummyClass(context.dummyCaller)],
		]);

		await context.emitter.dispatch("firstEvent");

		context.dummyCallerSpy.calledTimes(2);
	});

	it("should prevent duplicate listeners", async (context) => {
		context.emitter.listenMany(Array.from({ length: 5 }).fill(["firstEvent", context.dummyListener]));

		await context.emitter.dispatch("firstEvent");

		context.dummyCallerSpy.calledOnce();
	});

	it("should listen once", async (context) => {
		context.emitter.listenOnce("firstEvent", context.dummyListener);

		context.emitter.dispatchSync("firstEvent");
		context.emitter.dispatchSync("firstEvent");
		context.emitter.dispatchSync("firstEvent");

		context.dummyCallerSpy.calledOnce();

		context.emitter.dispatchSync("firstEvent");
		context.emitter.dispatchSync("firstEvent");
		context.emitter.dispatchSync("firstEvent");

		context.dummyCallerSpy.calledOnce();
	});

	it("should remove an event listener", (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);

		context.emitter.dispatchSync("firstEvent");

		context.dummyCallerSpy.calledOnce();

		context.emitter.forget("firstEvent", context.dummyListener);

		context.emitter.dispatchSync("firstEvent");

		context.dummyCallerSpy.calledOnce();
	});

	it("should emit one event", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);

		await context.emitter.dispatch("firstEvent");

		context.dummyCallerSpy.calledOnce();
	});

	it("should emit multiple events", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("firstEvent");

		context.dummyCallerSpy.calledTimes(5);
	});

	it("should not execute an event listener without await", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);

		context.emitter.dispatch("firstEvent");

		context.dummyCallerSpy.neverCalled();
	});

	it("should execute a wildcard listener with await", async (context) => {
		context.emitter.listen("*", context.dummyListener);

		await context.emitter.dispatchSeq("firstEvent");

		context.dummyCallerSpy.calledOnce();
	});

	it("should not execute an event listener without await (async behaviour)", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);

		context.emitter.dispatchSeq("firstEvent");

		context.dummyCallerSpy.neverCalled();
	});

	it("should emit all events in sequence", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));

		await context.emitter.dispatchSeq("firstEvent");

		context.dummyCallerSpy.calledTimes(3);
	});

	it("should execute an event listener without await", (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);

		context.emitter.dispatchSync("firstEvent");

		context.dummyCallerSpy.calledOnce();
	});

	it("should execute a wildcard listener without await", (context) => {
		context.emitter.listen("*", context.dummyListener);

		context.emitter.dispatchSync("firstEvent");

		context.dummyCallerSpy.calledOnce();
	});

	it("should emit all events in sequence", (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));

		context.emitter.dispatchSync("firstEvent");

		context.dummyCallerSpy.calledTimes(3);
	});

	it("should emit all events", async (context) => {
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));

		context.emitter.listen("secondEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("secondEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("secondEvent", new DummyClass(context.dummyCaller));

		await context.emitter.dispatchMany([
			["firstEvent", undefined],
			["secondEvent", undefined],
		]);

		context.dummyCallerSpy.calledTimes(6);
	});

	it("should emit all events", async (context) => {
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));

		context.emitter.listen("secondEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("secondEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("secondEvent", new DummyClass(context.dummyCaller));

		await context.emitter.dispatchManySeq([
			["firstEvent", undefined],
			["secondEvent", undefined],
		]);

		context.dummyCallerSpy.calledTimes(6);
	});

	it("should emit all events", async (context) => {
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("firstEvent", new DummyClass(context.dummyCaller));

		context.emitter.listen("secondEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("secondEvent", new DummyClass(context.dummyCaller));
		context.emitter.listen("secondEvent", new DummyClass(context.dummyCaller));

		context.emitter.dispatchManySync([
			["firstEvent", undefined],
			["secondEvent", undefined],
		]);

		context.dummyCallerSpy.calledTimes(6);
	});

	it("should clear all listeners", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("secondEvent", context.dummyListener);
		context.emitter.listen("*", context.dummyListener);

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("secondEvent");

		context.dummyCallerSpy.calledTimes(4);

		context.emitter.flush();

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("secondEvent");

		context.dummyCallerSpy.calledTimes(4);
	});

	it("should clear all listeners for an event", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("secondEvent", context.dummyListener);
		context.emitter.listen("*", context.dummyListener);

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("secondEvent");

		context.dummyCallerSpy.calledTimes(4);

		context.emitter.forget("firstEvent");

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("secondEvent");

		context.dummyCallerSpy.calledTimes(7);
	});

	it("should forget the given listeners by name", async (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("secondEvent", context.dummyListener);
		context.emitter.listen("*", context.dummyListener);

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("secondEvent");

		context.dummyCallerSpy.calledTimes(4);

		context.emitter.forgetMany(["firstEvent", "secondEvent"]);

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("secondEvent");

		context.dummyCallerSpy.calledTimes(6);
	});

	it("should forget the given listeners by name and function signature", async (context) => {
		const firstEvent = new DummyClass(context.dummyCaller);
		const secondEvent = new DummyClass(context.dummyCaller);

		context.emitter.listen("firstEvent", firstEvent);
		context.emitter.listen("secondEvent", secondEvent);
		context.emitter.listen("*", new DummyClass(context.dummyCaller));

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("secondEvent");

		context.dummyCallerSpy.calledTimes(4);

		context.emitter.forgetMany([
			["firstEvent", firstEvent],
			["secondEvent", secondEvent],
		]);

		await context.emitter.dispatch("firstEvent");
		await context.emitter.dispatch("secondEvent");

		context.dummyCallerSpy.calledTimes(6);
	});

	it("should return all listeners", (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("secondEvent", context.dummyListener);

		assert.equal(context.emitter.getListeners(), [context.dummyListener, context.dummyListener]);
	});

	it("should return all listeners for the given event", (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("secondEvent", context.dummyListener);

		assert.equal(context.emitter.getListeners("firstEvent"), [context.dummyListener]);
	});

	it("should return true if a listener is registered", (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);

		assert.true(context.emitter.hasListeners("firstEvent"));
	});

	it("should return false if no listener is registered", (context) => {
		assert.false(context.emitter.hasListeners("firstEvent"));
	});

	it("should return the total listener count", (context) => {
		context.emitter.listen("firstEvent", context.dummyListener);
		context.emitter.listen("secondEvent", context.dummyListener);
		context.emitter.listen("*", context.dummyListener);

		assert.is(context.emitter.countListeners("firstEvent"), 2);
		assert.is(context.emitter.countListeners("secondEvent"), 2);
		assert.is(context.emitter.countListeners(), 3);
	});
});

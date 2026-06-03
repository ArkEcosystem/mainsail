import { describe } from "@mainsail/test-runner";
import { EventEmitter } from "events";
import esmock from "esmock";

// The Handler listens on the worker_threads parentPort, which is null on the main thread
// where tests run. A fake EventEmitter parentPort lets us drive incoming messages and capture
// the replies the handler posts back.
class FakeParentPort extends EventEmitter {
	public readonly posted: any[] = [];

	public postMessage(message: unknown): void {
		this.posted.push(message);
	}
}

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe<{
	parentPort: FakeParentPort;
	makeHandler: <T extends object>(handler: T) => Promise<unknown>;
}>("Handler", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.parentPort = new FakeParentPort();
		context.makeHandler = async (handler) => {
			const { Handler } = await esmock("./handler", { worker_threads: { parentPort: context.parentPort } });
			return new Handler(handler);
		};
	});

	it("registers a single message listener on the parent port", async (context) => {
		await context.makeHandler({});

		assert.equal(context.parentPort.listenerCount("message"), 1);
	});

	it("invokes the requested method and posts the result keyed by id", async (context) => {
		await context.makeHandler({ add: (a: number, b: number) => a + b });

		context.parentPort.emit("message", { args: [2, 3], id: "req-1", method: "add" });
		await flush();

		assert.equal(context.parentPort.posted, [{ id: "req-1", result: 5 }]);
	});

	it("awaits async handler methods before replying", async (context) => {
		await context.makeHandler({ slow: async () => "done" });

		context.parentPort.emit("message", { args: [], id: "req-2", method: "slow" });
		await flush();

		assert.equal(context.parentPort.posted, [{ id: "req-2", result: "done" }]);
	});

	it("forwards the handler's arguments in order", async (context) => {
		let received: unknown[] = [];
		await context.makeHandler({ record: (...arguments_: unknown[]) => (received = arguments_) });

		context.parentPort.emit("message", { args: ["a", 1, { x: true }], id: "req-3", method: "record" });
		await flush();

		assert.equal(received, ["a", 1, { x: true }]);
	});

	it("posts an error reply when the method is not defined on the handler", async (context) => {
		await context.makeHandler({});

		context.parentPort.emit("message", { args: [], id: "req-4", method: "missing" });
		await flush();

		assert.equal(context.parentPort.posted, [
			{ error: "Method missing is not defined on the handler", id: "req-4" },
		]);
	});

	it("posts an error reply when the handler throws", async (context) => {
		await context.makeHandler({
			boom: () => {
				throw new Error("custom-error");
			},
		});

		context.parentPort.emit("message", { args: [], id: "req-5", method: "boom" });
		await flush();

		assert.equal(context.parentPort.posted, [{ error: "custom-error", id: "req-5" }]);
	});

	it("posts an error reply when an async handler rejects", async (context) => {
		await context.makeHandler({
			boom: async () => {
				throw new Error("custom-async-error");
			},
		});

		context.parentPort.emit("message", { args: [], id: "req-6", method: "boom" });
		await flush();

		assert.equal(context.parentPort.posted, [{ error: "custom-async-error", id: "req-6" }]);
	});

	it("normalizes a non-Error thrown value into an error reply", async (context) => {
		await context.makeHandler({
			boom: () => {
				throw "just a string";
			},
		});

		context.parentPort.emit("message", { args: [], id: "req-7", method: "boom" });
		await flush();

		assert.equal(context.parentPort.posted, [{ error: "just a string", id: "req-7" }]);
	});
});

import { Identifiers, LogLevels } from "@mainsail/constants";
import type { Contracts } from "@mainsail/contracts";

import { EventEmitter } from "events";
import { PassThrough } from "stream";

import { describe } from "@mainsail/test-runner";
import { Application } from "../application";
import { Subprocess } from "./subprocess";

// Minimal stand-in for a worker_threads Worker. It is an EventEmitter (matching the real
// Worker's event surface), records every postMessage / terminate call, and exposes writable
// stdout/stderr streams so the split2 line piping can be exercised.
class FakeWorker extends EventEmitter {
	public threadId = 42;
	public readonly stdout = new PassThrough();
	public readonly stderr = new PassThrough();
	public readonly posted: any[] = [];
	public terminateCalls = 0;
	public terminateResult = 7;

	public postMessage(message: unknown): void {
		this.posted.push(message);
	}

	public async terminate(): Promise<number> {
		this.terminateCalls++;
		return this.terminateResult;
	}
}

const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

type LogCalls = Record<string, unknown[][]>;

describe<{
	app: Application;
	worker: FakeWorker;
	logCalls: LogCalls;
	loggerContext: Contracts.Kernel.LoggerContext;
	create: () => Subprocess;
}>("Subprocess", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.logCalls = {};
		const logger: Record<string, (...arguments_: unknown[]) => void> = {};
		for (const level of [...LogLevels]) {
			context.logCalls[level] = [];
			logger[level] = (...arguments_: unknown[]) => context.logCalls[level].push(arguments_);
		}

		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);

		context.worker = new FakeWorker();
		context.loggerContext = "evm";

		context.create = () => new Subprocess(context.app, "crypto", context.loggerContext, context.worker as any);
	});

	it("constructor logs the spawned worker name including the thread id", (context) => {
		context.create();

		assert.equal(context.logCalls.debug[0], ["Spawning worker crypto-42"]);
	});

	it("captures the worker name at construction time so a later threadId reset is ignored", (context) => {
		const subprocess = context.create();
		// Node resets threadId to -1 once a worker exits; the captured name must not change.
		context.worker.threadId = -1;

		const promise = subprocess.sendRequest("noop");
		context.worker.emit("exit", 0);

		assert.equal(context.logCalls.debug.at(-1), ["Worker crypto-42 stopped with exit code 0"]);

		return assert.rejects(() => promise);
	});

	it("sendRequest posts a {args, id, method} message and resolves on the matching reply", async (context) => {
		const subprocess = context.create();

		const promise = subprocess.sendRequest<number>("add", 1, 2);

		assert.equal(context.worker.posted[0], { args: [1, 2], id: 1, method: "add" });

		context.worker.emit("message", { id: 1, result: 42 });

		assert.equal(await promise, 42);
	});

	it("sendRequest increments the request id for each call", (context) => {
		const subprocess = context.create();

		void subprocess.sendRequest("a");
		void subprocess.sendRequest("b");
		void subprocess.sendRequest("c");

		assert.equal(
			context.worker.posted.map((message) => message.id),
			[1, 2, 3],
		);
	});

	it("sendRequest rejects with an Error built from an error reply", async (context) => {
		const subprocess = context.create();

		const promise = subprocess.sendRequest("boom");
		context.worker.emit("message", { error: new Error("it failed"), id: 1 });

		await assert.rejects(() => promise, "it failed");
	});

	it("sendRequest deletes the callback once settled", async (context) => {
		const subprocess = context.create();

		const promise = subprocess.sendRequest("once");
		assert.equal(subprocess.getQueueSize(), 1);

		context.worker.emit("message", { id: 1, result: "ok" });
		await promise;

		assert.equal(subprocess.getQueueSize(), 0);
	});

	it("sendRequest rejects immediately once the worker is stopped", async (context) => {
		const subprocess = context.create();
		await subprocess.kill();

		await assert.rejects(() => subprocess.sendRequest("late"), "was killed");
		// Nothing should have been posted to a dead worker.
		assert.equal(context.worker.posted, []);
	});

	it("onMessage ignores a reply whose id has no pending callback", (context) => {
		const subprocess = context.create();

		// No callback registered for id 99; the optional chaining must keep this from throwing.
		assert.not.throws(() => context.worker.emit("message", { id: 99, result: "stray" }));
		assert.equal(subprocess.getQueueSize(), 0);
	});

	it("getQueueSize reflects the number of in-flight requests", (context) => {
		const subprocess = context.create();

		assert.equal(subprocess.getQueueSize(), 0);
		void subprocess.sendRequest("a");
		void subprocess.sendRequest("b");
		assert.equal(subprocess.getQueueSize(), 2);
	});

	it("kill marks the worker stopped and terminates the thread", async (context) => {
		const subprocess = context.create();

		assert.false(subprocess.isStopped());

		const result = await subprocess.kill();

		assert.true(subprocess.isStopped());
		assert.equal(result, 7);
		assert.equal(context.worker.terminateCalls, 1);
	});

	it("dispose marks the worker stopped and terminates the thread", async (context) => {
		const subprocess = context.create();

		const result = await subprocess.dispose();

		assert.true(subprocess.isStopped());
		assert.equal(result, 7);
		assert.equal(context.worker.terminateCalls, 1);
	});

	it("a request issued after dispose rejects with the dispose reason", async (context) => {
		const subprocess = context.create();
		await subprocess.dispose();

		await assert.rejects(() => subprocess.sendRequest("late"), "is being disposed");
	});

	it("drain resolves immediately when there are no in-flight requests", async (context) => {
		const subprocess = context.create();

		await assert.resolves(() => subprocess.drain());
	});

	it("drain resolves once the last in-flight request is replied to", async (context) => {
		const subprocess = context.create();

		void subprocess.sendRequest("a");
		void subprocess.sendRequest("b");

		let drained = false;
		const drainPromise = subprocess.drain().then(() => (drained = true));

		context.worker.emit("message", { id: 1, result: "ok" });
		await flush();
		assert.false(drained);

		context.worker.emit("message", { id: 2, result: "ok" });
		await drainPromise;
		assert.true(drained);
	});

	it("drain resolves when pending requests are rejected by a stop", async (context) => {
		const subprocess = context.create();

		void subprocess.sendRequest("a").catch(() => {});
		const drainPromise = subprocess.drain();

		context.worker.emit("exit", 1);

		await assert.resolves(() => drainPromise);
	});

	it("returns the same drain promise while a drain is pending", (context) => {
		const subprocess = context.create();
		void subprocess.sendRequest("a");

		const first = subprocess.drain();
		const second = subprocess.drain();

		assert.equal(first, second);
	});

	it("registerEventHandler dispatches event messages to the handler", (context) => {
		const subprocess = context.create();

		const received: unknown[] = [];
		subprocess.registerEventHandler("tick", (data) => received.push(data));

		context.worker.emit("message", { data: { value: 1 }, event: "tick" });

		assert.equal(received, [{ value: 1 }]);
	});

	it("ignores event messages with no registered handler", (context) => {
		const subprocess = context.create();

		assert.not.throws(() => context.worker.emit("message", { data: {}, event: "unknown" }));
	});

	it("a worker error logs, stops the worker, and rejects pending requests", async (context) => {
		const subprocess = context.create();

		const promise = subprocess.sendRequest("inflight");
		context.worker.emit("error", new Error("worker crashed"));

		assert.true(subprocess.isStopped());
		assert.equal(context.logCalls.error.at(-1), ["Worker crypto-42 error: worker crashed"]);

		await assert.rejects(() => promise, "worker crashed");
	});

	it("a worker exit logs and stops the worker", async (context) => {
		const subprocess = context.create();

		const promise = subprocess.sendRequest("inflight");
		context.worker.emit("exit", 3);

		assert.true(subprocess.isStopped());
		assert.equal(context.logCalls.debug.at(-1), ["Worker crypto-42 stopped with exit code 3"]);

		await assert.rejects(() => promise, "stopped with exit code 3");
	});

	it("keeps the first stop reason when a crash is followed by an exit", async (context) => {
		const subprocess = context.create();

		const promise = subprocess.sendRequest("inflight");
		context.worker.emit("error", new Error("crash first"));
		context.worker.emit("exit", 1);

		// The crash reason is more informative than the exit that follows it.
		await assert.rejects(() => promise, "crash first");
	});

	it("messageerror rejects pending requests without marking the worker stopped", async (context) => {
		const subprocess = context.create();

		const promise = subprocess.sendRequest("inflight");
		context.worker.emit("messageerror", new Error("bad payload"));

		// The worker stays alive after an undeserializable reply.
		assert.false(subprocess.isStopped());
		assert.equal(context.logCalls.error.at(-1), [
			"Worker crypto-42 message could not be deserialized: bad payload",
		]);
		assert.equal(subprocess.getQueueSize(), 0);

		await assert.rejects(() => promise, "bad payload");
	});

	it("routes a recognised log line to the matching logger level with the logger context", async (context) => {
		context.create();

		context.worker.stdout.write("[debug] hello world\n");
		await flush();

		assert.equal(context.logCalls.debug.at(-1), ["hello world", "evm"]);
	});

	it("routes an unknown log level to a warning", async (context) => {
		context.create();

		context.worker.stdout.write("[trace] something\n");
		await flush();

		assert.equal(context.logCalls.warn.at(-1), ["[unknown:trace] something"]);
	});

	it("falls back to console.log for stdout that does not match the log format", async (context) => {
		context.create();

		const consoleSpy = spy(console, "log");

		context.worker.stdout.write("plain output without level\n");
		await flush();

		consoleSpy.calledWith("plain output without level");
		consoleSpy.restore();
	});

	it("routes stderr lines to the logger error level", async (context) => {
		context.create();

		context.worker.stderr.write("a fatal stderr line\n");
		await flush();

		assert.equal(context.logCalls.error.at(-1), ["a fatal stderr line"]);
	});
});

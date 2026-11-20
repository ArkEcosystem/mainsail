import { describe } from "@mainsail/test-runner";

import { constants } from "../constants.js";
import { CloseReason } from "../enums.js";
import { ConnectionError } from "../errors.js";
import { RequestQueue } from "./request-queue.js";

const limits = { maxConcurrentRequests: 2, maxQueuedRequests: 1 };

// "raw" has no route: only the connection's limits apply to it.
const limitsFor = (path: string) => (path === "raw" ? undefined : limits);

// Resolves on the next macrotask, so a pending acquire that may settle has settled.
const settle = async (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe<{
	queue: RequestQueue;
}>("RequestQueue", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.queue = new RequestQueue(limitsFor);
	});

	it("should let requests through up to the route's limit and queue the next one until a slot frees", async ({
		queue,
	}) => {
		await queue.acquire("echo");
		await queue.acquire("echo");

		let acquired = false;
		const third = queue.acquire("echo").then(() => (acquired = true));
		await settle();
		assert.false(acquired);

		queue.release("echo");
		await third;
		assert.true(acquired);
	});

	it("should fail at once when the route's queue is full", async ({ queue }) => {
		await queue.acquire("echo");
		await queue.acquire("echo");
		void queue.acquire("echo").catch(() => {});

		const error = await queue.acquire("echo").catch((error) => error);

		assert.equal(error.reason, CloseReason.RequestQueueFull);
		assert.equal(error.message, "1 echo requests already queued");
	});

	it("should not let a route without free slots block another route", async ({ queue }) => {
		await queue.acquire("echo");
		await queue.acquire("echo");
		void queue.acquire("echo").catch(() => {});

		await queue.acquire("other");
	});

	it("should hold raw requests without route limits to the connection's limit", async ({ queue }) => {
		for (let index = 0; index < constants.MAX_REQUESTS_IN_FLIGHT; index++) {
			await queue.acquire("raw");
		}

		let acquired = false;
		const next = queue.acquire("raw").then(() => (acquired = true));
		await settle();
		assert.false(acquired);

		queue.release("raw");
		await next;
	});

	it("should fail at once when the connection's queue is full", async ({ queue }) => {
		for (let index = 0; index < constants.MAX_REQUESTS_IN_FLIGHT; index++) {
			await queue.acquire("raw");
		}
		for (let index = 0; index < constants.MAX_QUEUED_REQUESTS; index++) {
			void queue.acquire("raw").catch(() => {});
		}

		const error = await queue.acquire("raw").catch((error) => error);

		assert.equal(error.reason, CloseReason.RequestQueueFull);
	});

	it("should fail everything waiting on abort", async ({ queue }) => {
		await queue.acquire("echo");
		await queue.acquire("echo");
		const waiting = queue.acquire("echo").catch((error) => error);

		queue.abort(new ConnectionError(CloseReason.RemoteClose, "closed"));

		assert.equal((await waiting).reason, CloseReason.RemoteClose);

		// The queue is empty again: a slot freed later wakes nobody and a new request can queue.
		queue.release("echo");
		queue.release("echo");
		await queue.acquire("echo");
	});
});

import { describe } from "@mainsail/test-runner";

import { Application } from "../../application";
import { MemoryLogger } from "./drivers/memory";
import { WorkerLogger } from "./drivers/worker";
import { LogManager } from "./manager";

describe<{
	app: Application;
}>("LogManager", ({ assert, beforeEach, it, stub }) => {
	beforeEach((context) => {
		context.app = new Application();
	});

	it("should boot and resolve the memory driver on the main thread", async ({ app }) => {
		stub(app, "isWorker").returnValue(false);

		const manager = app.resolve(LogManager);
		await manager.boot();

		assert.instance(manager.driver(), MemoryLogger);
	});

	it("should boot and resolve the worker driver inside a worker thread", async ({ app }) => {
		stub(app, "isWorker").returnValue(true);

		const manager = app.resolve(LogManager);
		await manager.boot();

		assert.instance(manager.driver(), WorkerLogger);
	});
});

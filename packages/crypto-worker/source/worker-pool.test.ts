import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { WorkerPool } from "./worker-pool";

const makeWorker = () => ({
	boot: async () => {},
	dispose: async () => {},
	getQueueSize: () => 0,
	isStopped: () => false,
});

describe<{
	app: Application;
	workerPool: WorkerPool;
	pool: any[];
	flags: any;
	logger: any;
	options: { workerCount: number; workerLoggingEnabled: boolean };
}>("WorkerPool", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.flags = { network: "testnet" };
		context.logger = { info: () => {}, warn: () => {} };
		context.pool = [makeWorker(), makeWorker(), makeWorker()];
		context.options = { workerCount: context.pool.length, workerLoggingEnabled: false };

		let index = 0;
		const createWorker = () => context.pool[index++];

		context.app = new Application();
		context.app.bind(Identifiers.Config.Flags).toConstantValue(context.flags);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.CryptoWorker.Worker.Factory).toConstantValue(() => createWorker());
		context.app
			.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: (key: string) => (context.options as any)[key] })
			.whenTagged("plugin", "crypto-worker");

		context.workerPool = context.app.resolve(WorkerPool);
	});

	it("boots every configured worker with the merged flags (eager + background)", async ({
		workerPool,
		pool,
		flags,
	}) => {
		const boots = pool.map((worker) => spy(worker, "boot"));

		await workerPool.boot();
		await workerPool.whenReady();

		for (const boot of boots) {
			boot.calledOnce();
			boot.calledWith({ ...flags, thread: "crypto-worker", workerLoggingEnabled: false });
		}
	});

	it("boots only the eager subset before returning, then grows the rest in the background", async ({
		workerPool,
		pool,
	}) => {
		// Gate the third (background) worker's boot so it stays out of the pool until released.
		let releaseThird = () => {};
		pool[2].boot = () => new Promise<void>((resolve) => (releaseThird = resolve));

		await workerPool.boot();

		// The eager workers are usable immediately; getWorker never hands out the still-booting one.
		const handedOut = new Set([workerPool.getWorker(), workerPool.getWorker(), workerPool.getWorker()]);
		assert.equal(handedOut.has(pool[2]), false);
		assert.equal(handedOut.has(pool[0]), true);
		assert.equal(handedOut.has(pool[1]), true);

		// Once it finishes booting in the background it joins the pool.
		releaseThird();
		await workerPool.whenReady();

		stub(pool[0], "getQueueSize").returnValue(5);
		stub(pool[1], "getQueueSize").returnValue(5);
		stub(pool[2], "getQueueSize").returnValue(0);
		assert.equal(workerPool.getWorker(), pool[2]);
	});

	it("boot logs the eager/total split", async ({ workerPool, logger, pool }) => {
		const info = spy(logger, "info");

		await workerPool.boot();

		info.calledWith(`Booting up 2/${pool.length} crypto workers (remaining in background)`);
	});

	it("boot forwards the workerLoggingEnabled flag from configuration", async ({ workerPool, pool, options }) => {
		options.workerLoggingEnabled = true;
		const boot = spy(pool[0], "boot");

		await workerPool.boot();
		await workerPool.whenReady();

		boot.calledWith({ network: "testnet", thread: "crypto-worker", workerLoggingEnabled: true });
	});

	it("dispose disposes every worker (incl. background) and empties the pool", async ({ workerPool, pool }) => {
		const disposes = pool.map((worker) => spy(worker, "dispose"));

		await workerPool.boot();
		await workerPool.whenReady();
		await workerPool.dispose();

		for (const dispose of disposes) {
			dispose.calledOnce();
		}
		assert.throws(() => workerPool.getWorker(), "No crypto workers available");
	});

	it("getWorker throws when no workers have been booted", ({ workerPool }) => {
		assert.throws(() => workerPool.getWorker(), "No crypto workers available");
	});

	it("getWorker throws when every worker is stopped", async ({ workerPool, pool }) => {
		for (const worker of pool) {
			stub(worker, "isStopped").returnValue(true);
		}

		await workerPool.boot();
		await workerPool.whenReady();

		assert.throws(() => workerPool.getWorker(), "No crypto workers available");
	});

	it("getWorker selects the worker with the smallest queue", async ({ workerPool, pool }) => {
		stub(pool[0], "getQueueSize").returnValue(5);
		stub(pool[1], "getQueueSize").returnValue(1);
		stub(pool[2], "getQueueSize").returnValue(3);

		await workerPool.boot();
		await workerPool.whenReady();

		assert.equal(workerPool.getWorker(), pool[1]);
		assert.equal(workerPool.getWorker(), pool[1]);
	});

	it("getWorker round-robins when the queues are tied", async ({ workerPool, pool }) => {
		await workerPool.boot();
		await workerPool.whenReady();

		assert.equal(workerPool.getWorker(), pool[0]);
		assert.equal(workerPool.getWorker(), pool[1]);
		assert.equal(workerPool.getWorker(), pool[2]);
		assert.equal(workerPool.getWorker(), pool[0]);
	});

	it("getWorker ignores stopped workers", async ({ workerPool, pool }) => {
		stub(pool[0], "isStopped").returnValue(true);

		await workerPool.boot();
		await workerPool.whenReady();

		assert.not.equal(workerPool.getWorker(), pool[0]);
	});
});

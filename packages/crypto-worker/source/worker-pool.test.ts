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
		context.logger = { info: () => {} };
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

	it("boot creates the configured number of workers and boots each with the merged flags", async ({
		workerPool,
		pool,
		flags,
	}) => {
		const boots = pool.map((worker) => spy(worker, "boot"));

		await workerPool.boot();

		for (const boot of boots) {
			boot.calledOnce();
			boot.calledWith({ ...flags, thread: "crypto-worker", workerLoggingEnabled: false });
		}
	});

	it("boot logs how many workers it starts", async ({ workerPool, logger, pool }) => {
		const info = spy(logger, "info");

		await workerPool.boot();

		info.calledWith(`Booting up ${pool.length} crypto workers`);
	});

	it("boot forwards the workerLoggingEnabled flag from configuration", async ({ workerPool, pool, options }) => {
		options.workerLoggingEnabled = true;
		const boot = spy(pool[0], "boot");

		await workerPool.boot();

		boot.calledWith({ network: "testnet", thread: "crypto-worker", workerLoggingEnabled: true });
	});

	it("dispose disposes every worker and empties the pool", async ({ workerPool, pool }) => {
		const disposes = pool.map((worker) => spy(worker, "dispose"));

		await workerPool.boot();
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

		assert.throws(() => workerPool.getWorker(), "No crypto workers available");
	});

	it("getWorker selects the worker with the smallest queue", async ({ workerPool, pool }) => {
		stub(pool[0], "getQueueSize").returnValue(5);
		stub(pool[1], "getQueueSize").returnValue(1);
		stub(pool[2], "getQueueSize").returnValue(3);

		await workerPool.boot();

		assert.equal(workerPool.getWorker(), pool[1]);
	});

	it("getWorker round-robins when the queues are tied", async ({ workerPool, pool }) => {
		await workerPool.boot();

		assert.equal(workerPool.getWorker(), pool[0]);
		assert.equal(workerPool.getWorker(), pool[1]);
		assert.equal(workerPool.getWorker(), pool[2]);
		assert.equal(workerPool.getWorker(), pool[0]);
	});

	it("getWorker ignores stopped workers", async ({ workerPool, pool }) => {
		stub(pool[0], "isStopped").returnValue(true);

		await workerPool.boot();

		assert.not.equal(workerPool.getWorker(), pool[0]);
	});
});

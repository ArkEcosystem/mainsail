import { Identifiers } from "@mainsail/constants";
import { Application, Ipc } from "@mainsail/kernel";
import { EventEmitter } from "events";
import esmock from "esmock";
import { PassThrough } from "stream";

import { describe } from "@mainsail/test-runner";
import { Worker as WorkerInstance } from "./worker";

// Records every `new Worker(...)` so the factory test can assert how the thread is spawned.
const constructions: any[][] = [];

// Stand-in for worker_threads.Worker: an EventEmitter exposing the stdout/stderr streams and
// threadId that Ipc.Subprocess reads, so the real Subprocess wraps it without a real thread.
class FakeWorker extends EventEmitter {
	public threadId = 1;
	public readonly stdout = new PassThrough();
	public readonly stderr = new PassThrough();

	public constructor(...arguments_: any[]) {
		super();
		constructions.push(arguments_);
	}

	public postMessage(): void {}
	public async terminate(): Promise<number> {
		return 0;
	}
}

// Load the provider with worker_threads.Worker swapped for the fake; the real Ipc.Subprocess
// and ./worker.js stay in place.
const { ServiceProvider } = await esmock("./service-provider", {
	worker_threads: { Worker: FakeWorker },
});

describe<{
	app: Application;
	serviceProvider: any;
}>("ServiceProvider", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		constructions.length = 0;

		context.app = new Application();
		context.app.bind(Identifiers.Config.Flags).toConstantValue({ network: "testnet" });
		// Ipc.Subprocess resolves the logger from the container when the factory runs.
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {}, error: () => {} });

		context.serviceProvider = context.app.resolve(ServiceProvider);
	});

	it("register binds the worker instance, worker factory, worker pool and subprocess factory", async (context) => {
		await context.serviceProvider.register();

		assert.true(context.app.isBound(Identifiers.CryptoWorker.Worker.Instance));
		assert.true(context.app.isBound(Identifiers.CryptoWorker.Worker.Factory));
		assert.true(context.app.isBound(Identifiers.CryptoWorker.WorkerPool));
		assert.true(context.app.isBound(Identifiers.CryptoWorker.WorkerSubprocess.Factory));
		assert.function(context.app.get(Identifiers.CryptoWorker.WorkerSubprocess.Factory));
	});

	it("the subprocess factory spawns the worker script with piped stdio and wraps it in an Ipc.Subprocess", async (context) => {
		await context.serviceProvider.register();

		const factory = context.app.get(Identifiers.CryptoWorker.WorkerSubprocess.Factory) as () => Ipc.Subprocess;
		const subprocess = factory();

		assert.length(constructions, 1);
		const [scriptPath, options] = constructions[0];
		assert.true(scriptPath.endsWith("worker-script.js"));
		assert.equal(options, { stderr: true, stdout: true });
		assert.instance(subprocess, Ipc.Subprocess);
	});

	it("the worker factory resolves a Worker instance", async (context) => {
		await context.serviceProvider.register();

		const factory = context.app.get<() => WorkerInstance>(Identifiers.CryptoWorker.Worker.Factory);

		assert.instance(factory(), WorkerInstance);
	});

	it("boot boots the worker pool", async (context) => {
		await context.serviceProvider.register();

		const pool = { boot: async () => {}, dispose: async () => {} };
		context.app.rebind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(pool);
		const boot = spy(pool, "boot");

		await context.serviceProvider.boot();

		boot.calledOnce();
	});

	it("dispose disposes the worker pool", async (context) => {
		await context.serviceProvider.register();

		const pool = { boot: async () => {}, dispose: async () => {} };
		context.app.rebind(Identifiers.CryptoWorker.WorkerPool).toConstantValue(pool);
		const dispose = spy(pool, "dispose");

		await context.serviceProvider.dispose();

		dispose.calledOnce();
	});

	it("is required", async (context) => {
		assert.true(await context.serviceProvider.required());
	});
});

const importFresh = (moduleName: string) => import(`${moduleName}?${Date.now()}`);

describe<{
	app: Application;
	serviceProvider: any;
}>("ServiceProvider.configSchema", ({ assert, beforeEach, it }) => {
	const importDefaults = async () => (await importFresh("../distribution/defaults.js")).defaults;

	beforeEach((context) => {
		context.app = new Application();
		context.serviceProvider = context.app.resolve(ServiceProvider);

		for (const key of Object.keys(process.env)) {
			if (key.includes("MAINSAIL_CRYPTO_WORKER")) {
				delete process.env[key];
			}
		}
	});

	it("should validate schema using defaults", async ({ serviceProvider }) => {
		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.number(result.value.workerCount);
		assert.boolean(result.value.workerLoggingEnabled);
	});

	it("should allow configuration extension", async ({ serviceProvider }) => {
		const defaults = await importDefaults();
		defaults.customField = "dummy";

		const result = serviceProvider.configSchema().validate(defaults);

		assert.undefined(result.error);
		assert.equal(result.value.customField, "dummy");
	});

	it("should parse process.env.MAINSAIL_CRYPTO_WORKER_COUNT", async ({ serviceProvider }) => {
		process.env.MAINSAIL_CRYPTO_WORKER_COUNT = "1";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.equal(result.value.workerCount, 1);
	});

	it("should throw if process.env.MAINSAIL_CRYPTO_WORKER_COUNT is below the minimum", async ({ serviceProvider }) => {
		process.env.MAINSAIL_CRYPTO_WORKER_COUNT = "0";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.defined(result.error);
	});

	it("should throw if process.env.MAINSAIL_CRYPTO_WORKER_COUNT is not a number", async ({ serviceProvider }) => {
		process.env.MAINSAIL_CRYPTO_WORKER_COUNT = "not-a-number";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.defined(result.error);
	});

	it("should throw if process.env.MAINSAIL_CRYPTO_WORKER_COUNT is not an integer", async ({ serviceProvider }) => {
		process.env.MAINSAIL_CRYPTO_WORKER_COUNT = "1.5";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.defined(result.error);
	});

	it("should throw if process.env.MAINSAIL_CRYPTO_WORKER_COUNT exceeds the available cpus", async ({
		serviceProvider,
	}) => {
		process.env.MAINSAIL_CRYPTO_WORKER_COUNT = "9999";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.defined(result.error);
	});

	it("should parse process.env.MAINSAIL_CRYPTO_WORKER_LOGGING_ENABLED", async ({ serviceProvider }) => {
		process.env.MAINSAIL_CRYPTO_WORKER_LOGGING_ENABLED = "true";

		const result = serviceProvider.configSchema().validate(await importDefaults());

		assert.undefined(result.error);
		assert.true(result.value.workerLoggingEnabled);
	});
});

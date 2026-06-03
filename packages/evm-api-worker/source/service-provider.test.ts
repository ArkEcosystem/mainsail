import { Identifiers } from "@mainsail/constants";
import { Application, Ipc } from "@mainsail/kernel";
import { EventEmitter } from "events";
import esmock from "esmock";
import { PassThrough } from "stream";

import { describe } from "@mainsail/test-runner";

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
	worker: any;
}>("ServiceProvider", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		constructions.length = 0;
		context.worker = { boot: async () => {}, dispose: async () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Config.Flags).toConstantValue({ network: "testnet" });
		// Ipc.Subprocess resolves the logger from the container when the factory runs.
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {}, error: () => {} });

		context.serviceProvider = context.app.resolve(ServiceProvider);

		// register() resolves the WorkerInstance, whose @postConstruct would invoke the factory
		// and spawn. Intercept that resolution so only the explicit factory call below runs it.
		stub(context.app, "resolve").returnValue(context.worker);
	});

	it("register binds the worker subprocess factory and the worker", async (context) => {
		assert.false(context.app.isBound(Identifiers.Evm.WorkerSubprocess.Factory));
		assert.false(context.app.isBound(Identifiers.Evm.Worker));

		await context.serviceProvider.register();

		assert.true(context.app.isBound(Identifiers.Evm.WorkerSubprocess.Factory));
		assert.true(context.app.isBound(Identifiers.Evm.Worker));
		assert.function(context.app.get(Identifiers.Evm.WorkerSubprocess.Factory));
		assert.equal(context.app.get(Identifiers.Evm.Worker), context.worker);
	});

	it("the subprocess factory spawns the worker script with piped stdio and wraps it in an Ipc.Subprocess", async (context) => {
		await context.serviceProvider.register();

		const factory = context.app.get(Identifiers.Evm.WorkerSubprocess.Factory) as () => Ipc.Subprocess;
		const subprocess = factory();

		assert.length(constructions, 1);
		const [scriptPath, options] = constructions[0];
		assert.true(scriptPath.endsWith("worker-script.js"));
		assert.equal(options, { stderr: true, stdout: true });
		assert.instance(subprocess, Ipc.Subprocess);
	});

	it("boot delegates to the worker with the flags and the thread name", async (context) => {
		await context.serviceProvider.register();
		const boot = spy(context.worker, "boot");

		await context.serviceProvider.boot();

		boot.calledOnce();
		boot.calledWith({ network: "testnet", thread: "evm-api" });
	});

	it("dispose delegates to the worker", async (context) => {
		await context.serviceProvider.register();
		const dispose = spy(context.worker, "dispose");

		await context.serviceProvider.dispose();

		dispose.calledOnce();
	});

	it("is required", async (context) => {
		assert.true(await context.serviceProvider.required());
	});
});

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { ServiceProvider } from "./service-provider";

describe<{
	app: Application;
	serviceProvider: ServiceProvider;
	worker: any;
	flags: any;
}>("ServiceProvider", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.flags = { network: "testnet" };
		context.worker = { boot: async () => {}, dispose: async () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Config.Flags).toConstantValue(context.flags);

		// Resolve the provider before stubbing resolve, so its own injection still works.
		context.serviceProvider = context.app.resolve(ServiceProvider);

		// register() resolves the WorkerInstance, whose @postConstruct spawns a real
		// worker_threads.Worker. Intercept that resolution so the unit test stays in-process.
		stub(context.app, "resolve").returnValue(context.worker);
	});

	it("register binds the worker subprocess factory and the worker", async (context) => {
		assert.false(context.app.isBound(Identifiers.TransactionPool.WorkerSubprocess.Factory));
		assert.false(context.app.isBound(Identifiers.TransactionPool.Worker));

		await context.serviceProvider.register();

		assert.true(context.app.isBound(Identifiers.TransactionPool.WorkerSubprocess.Factory));
		assert.true(context.app.isBound(Identifiers.TransactionPool.Worker));
		assert.function(context.app.get(Identifiers.TransactionPool.WorkerSubprocess.Factory));
		assert.equal(context.app.get(Identifiers.TransactionPool.Worker), context.worker);
	});

	it("boot delegates to the worker with the flags and the thread name", async (context) => {
		await context.serviceProvider.register();
		const boot = spy(context.worker, "boot");

		await context.serviceProvider.boot();

		boot.calledOnce();
		boot.calledWith({ network: "testnet", thread: "transaction-pool" });
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

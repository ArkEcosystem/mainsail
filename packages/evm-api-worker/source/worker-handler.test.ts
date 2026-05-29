import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { CommitHandler, SetPeerCountHandler, StartHandler } from "./handlers/index.js";
import { WorkerScriptHandler } from "./worker-handler";

describe<{
	subject: WorkerScriptHandler;
	handler: any;
	resolve: any;
}>("WorkerScriptHandler", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		// WorkerScriptHandler owns a private `new Application()`; stub the prototype so the
		// handler resolutions and lifecycle calls stay in-process.
		context.handler = { handle: async () => {} };
		context.resolve = stub(Application.prototype, "resolve").returnValue(context.handler);

		context.subject = new WorkerScriptHandler();
	});

	it("boot bootstraps the app with the flags and boots it", async ({ subject }) => {
		const bootstrap = stub(Application.prototype, "bootstrap").resolvedValue(undefined);
		const boot = stub(Application.prototype, "boot").resolvedValue(undefined);
		const flags = { network: "testnet" } as any;

		await subject.boot(flags);

		bootstrap.calledWith({ flags });
		boot.calledOnce();
	});

	it("dispose terminates the app", async ({ subject }) => {
		const terminate = stub(Application.prototype, "terminate").resolvedValue(undefined);

		await subject.dispose();

		terminate.calledOnce();
	});

	it("start resolves the StartHandler and forwards the height", async ({ subject, handler, resolve }) => {
		const handle = spy(handler, "handle");

		await subject.start(42);

		resolve.calledWith(StartHandler);
		handle.calledWith(42);
	});

	it("setPeerCount resolves the SetPeerCountHandler and forwards the count", async ({
		subject,
		handler,
		resolve,
	}) => {
		const handle = spy(handler, "handle");

		await subject.setPeerCount(5);

		resolve.calledWith(SetPeerCountHandler);
		handle.calledWith(5);
	});

	it("commit resolves the CommitHandler and forwards the height", async ({ subject, handler, resolve }) => {
		const handle = spy(handler, "handle");

		await subject.commit(99);

		resolve.calledWith(CommitHandler);
		handle.calledWith(99);
	});
});

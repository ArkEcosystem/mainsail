import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import {
	CommitHandler,
	ForgetPeerHandler,
	GetTransactionsHandler,
	ReloadWebhooksHandler,
	RemoveTransactionHandler,
	SetPeerHandler,
	StartHandler,
} from "./handlers/index.js";
import { WorkerScriptHandler } from "./worker-handler";

describe<{
	subject: WorkerScriptHandler;
	handler: any;
	resolve: any;
}>("WorkerScriptHandler", ({ assert, beforeEach, it, spy, stub }) => {
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

	it("commit resolves the CommitHandler and forwards all arguments", async ({ subject, handler, resolve }) => {
		const handle = spy(handler, "handle");

		await subject.commit(10, ["alice"], 5000, true);

		resolve.calledWith(CommitHandler);
		handle.calledWith(10, ["alice"], 5000, true);
	});

	it("getTransactions resolves the GetTransactionsHandler and returns its result", async ({
		subject,
		handler,
		resolve,
	}) => {
		const batch = { transactions: [Buffer.from("tx")] };
		const handle = stub(handler, "handle").resolvedValue(batch);
		const options = { limit: 5 } as any;

		const result = await subject.getTransactions(options);

		resolve.calledWith(GetTransactionsHandler);
		handle.calledWith(options);
		assert.equal(result, batch);
	});

	it("removeTransaction resolves the RemoveTransactionHandler and forwards address and id", async ({
		subject,
		handler,
		resolve,
	}) => {
		const handle = spy(handler, "handle");

		await subject.removeTransaction("address-1", "hash-1");

		resolve.calledWith(RemoveTransactionHandler);
		handle.calledWith("address-1", "hash-1");
	});

	it("setPeer resolves the SetPeerHandler and forwards the ip", async ({ subject, handler, resolve }) => {
		const handle = spy(handler, "handle");

		await subject.setPeer("127.0.0.1");

		resolve.calledWith(SetPeerHandler);
		handle.calledWith("127.0.0.1");
	});

	it("forgetPeer resolves the ForgetPeerHandler and forwards the ip", async ({ subject, handler, resolve }) => {
		const handle = spy(handler, "handle");

		await subject.forgetPeer("127.0.0.1");

		resolve.calledWith(ForgetPeerHandler);
		handle.calledWith("127.0.0.1");
	});

	it("reloadWebhooks resolves the ReloadWebhooksHandler", async ({ subject, handler, resolve }) => {
		const handle = spy(handler, "handle");

		await subject.reloadWebhooks();

		resolve.calledWith(ReloadWebhooksHandler);
		handle.calledOnce();
	});
});

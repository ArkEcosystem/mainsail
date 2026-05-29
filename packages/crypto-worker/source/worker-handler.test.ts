import { Identifiers } from "@mainsail/constants";
import { Application, Services } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { WorkerScriptHandler } from "./worker-handler";

describe<{
	subject: WorkerScriptHandler;
	impl: any;
	toCalls: unknown[];
	resolve: any;
	bootstrap: any;
	boot: any;
	terminate: any;
	rebind: any;
}>("WorkerScriptHandler", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.impl = {
			callBlockFactory: async () => {},
			callConsensusSignature: async () => {},
			callPublicKeyFactory: async () => {},
			callTransactionFactory: async () => {},
			callWalletSignature: async () => {},
		};
		context.toCalls = [];

		// WorkerScriptHandler owns a private `new Application()`; stub the prototype so bootstrap,
		// boot, the WorkerImpl resolution and the logger rebind all stay in-process.
		context.resolve = stub(Application.prototype, "resolve").returnValue(context.impl);
		context.bootstrap = stub(Application.prototype, "bootstrap").resolvedValue(undefined);
		context.boot = stub(Application.prototype, "boot").resolvedValue(undefined);
		context.terminate = stub(Application.prototype, "terminate").resolvedValue(undefined);
		context.rebind = stub(Application.prototype, "rebind").returnValue({
			to: (value: unknown) => context.toCalls.push(value),
		});

		context.subject = new WorkerScriptHandler();
	});

	it("boot bootstraps with the flags, boots and resolves the worker impl", async ({
		subject,
		bootstrap,
		boot,
		resolve,
		rebind,
	}) => {
		await subject.boot({ workerLoggingEnabled: true } as any);

		bootstrap.calledWith({ flags: { workerLoggingEnabled: true } });
		boot.calledOnce();
		resolve.calledOnce();
		// Logging enabled → the logger is left in place.
		rebind.neverCalled();
	});

	it("boot rebinds the logger to the null logger when worker logging is disabled", async ({
		subject,
		rebind,
		toCalls,
	}) => {
		await subject.boot({ workerLoggingEnabled: false } as any);

		rebind.calledWith(Identifiers.Services.Log.Service);
		assert.equal(toCalls, [Services.Log.NullLogger]);
	});

	it("dispose terminates the app", async ({ subject, terminate }) => {
		await subject.dispose();

		terminate.calledOnce();
	});

	it("consensusSignature delegates to the worker impl", async ({ subject, impl }) => {
		await subject.boot({ workerLoggingEnabled: true } as any);
		const call = spy(impl, "callConsensusSignature");
		const message = Buffer.from("message-to-sign");
		const privateKey = Buffer.from("consensus-private-key");

		await subject.consensusSignature("sign", [message, privateKey]);

		call.calledWith("sign", [message, privateKey]);
	});

	it("walletSignature delegates to the worker impl", async ({ subject, impl }) => {
		await subject.boot({ workerLoggingEnabled: true } as any);
		const call = spy(impl, "callWalletSignature");
		const message = Buffer.from("message-to-sign");
		const privateKey = Buffer.from("wallet-private-key");

		await subject.walletSignature("signRecoverable", [message, privateKey]);

		call.calledWith("signRecoverable", [message, privateKey]);
	});

	it("blockFactory delegates to the worker impl", async ({ subject, impl }) => {
		await subject.boot({ workerLoggingEnabled: true } as any);
		const call = spy(impl, "callBlockFactory");

		await subject.blockFactory("fromHex", ["0a1b2c3d"]);

		call.calledWith("fromHex", ["0a1b2c3d"]);
	});

	it("transactionFactory delegates to the worker impl", async ({ subject, impl }) => {
		await subject.boot({ workerLoggingEnabled: true } as any);
		const call = spy(impl, "callTransactionFactory");
		const bytes = Buffer.from("deadbeef", "hex");

		await subject.transactionFactory("fromBytes", [bytes]);

		call.calledWith("fromBytes", [bytes]);
	});

	it("publicKeyFactory delegates to the worker impl", async ({ subject, impl }) => {
		await subject.boot({ workerLoggingEnabled: true } as any);
		const call = spy(impl, "callPublicKeyFactory");

		await subject.publicKeyFactory("fromMnemonic", ["clay harbor essay analyst"]);

		call.calledWith("fromMnemonic", ["clay harbor essay analyst"]);
	});
});

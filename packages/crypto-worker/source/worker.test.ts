import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { Worker } from "./worker";

describe<{
	app: Application;
	worker: Worker;
	ipc: any;
}>("Worker", ({ assert, beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.ipc = {
			dispose: async () => 0,
			drain: async () => {},
			getQueueSize: () => 3,
			isStopped: () => false,
			kill: async () => 7,
			sendRequest: async () => {},
		};

		context.app = new Application();
		// The injected factory hands back our fake subprocess instead of spawning a thread.
		context.app.bind(Identifiers.CryptoWorker.WorkerSubprocess.Factory).toConstantValue(() => context.ipc);

		context.worker = context.app.resolve(Worker);
	});

	it("boot sends a single boot request and memoizes it", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");
		const flags = { thread: "crypto-worker" } as any;

		await worker.boot(flags);
		await worker.boot(flags);

		sendRequest.calledOnce();
		sendRequest.calledWith("boot", flags);
	});

	it("dispose drains, requests an inner dispose, then terminates the subprocess", async ({ worker, ipc }) => {
		const drain = spy(ipc, "drain");
		const sendRequest = spy(ipc, "sendRequest");
		const dispose = spy(ipc, "dispose");

		await worker.dispose();

		drain.calledOnce();
		sendRequest.calledWith("dispose");
		dispose.calledOnce();
	});

	it("dispose still terminates the subprocess when the inner dispose request fails", async ({ worker, ipc }) => {
		ipc.sendRequest = async () => {
			throw new Error("worker already gone");
		};
		const dispose = spy(ipc, "dispose");

		await assert.resolves(() => worker.dispose());

		dispose.calledOnce();
	});

	it("dispose is memoized across calls", async ({ worker, ipc }) => {
		const drain = spy(ipc, "drain");

		await worker.dispose();
		await worker.dispose();

		drain.calledOnce();
	});

	it("kill terminates the subprocess and returns its exit code", async ({ worker, ipc }) => {
		const kill = spy(ipc, "kill");

		assert.equal(await worker.kill(), 7);
		kill.calledOnce();
	});

	it("getQueueSize reports the subprocess queue size", ({ worker }) => {
		assert.equal(worker.getQueueSize(), 3);
	});

	it("isStopped reflects the subprocess state", ({ worker, ipc }) => {
		assert.false(worker.isStopped());

		stub(ipc, "isStopped").returnValue(true);

		assert.true(worker.isStopped());
	});

	it("consensusSignature forwards the method and arguments to the subprocess", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.consensusSignature("sign" as any, "a" as any, "b" as any);

		sendRequest.calledWith("consensusSignature", "sign", ["a", "b"]);
	});

	it("walletSignature forwards the method and arguments to the subprocess", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.walletSignature("verify" as any, "a" as any);

		sendRequest.calledWith("walletSignature", "verify", ["a"]);
	});

	it("blockFactory forwards the method and arguments to the subprocess", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.blockFactory("make" as any, "data" as any);

		sendRequest.calledWith("blockFactory", "make", ["data"]);
	});

	it("transactionFactory forwards the method and arguments to the subprocess", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.transactionFactory("fromBytes" as any, "bytes" as any);

		sendRequest.calledWith("transactionFactory", "fromBytes", ["bytes"]);
	});

	it("publicKeyFactory forwards the method and arguments to the subprocess", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.publicKeyFactory("fromMnemonic" as any, "mnemonic" as any);

		sendRequest.calledWith("publicKeyFactory", "fromMnemonic", ["mnemonic"]);
	});
});

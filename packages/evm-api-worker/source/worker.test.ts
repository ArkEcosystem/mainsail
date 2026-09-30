import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { Worker } from "./worker";

describe<{
	app: Application;
	worker: Worker;
	ipc: any;
	eventDispatcher: any;
	p2pRepository: any;
}>("Worker", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.ipc = {
			dispose: async () => 0,
			drain: async () => {},
			getQueueSize: () => 3,
			kill: async () => 7,
			registerEventHandler: () => {},
			sendRequest: async () => {},
		};
		context.eventDispatcher = { listen: () => {} };
		context.p2pRepository = { getPeers: () => [] };

		context.app = new Application();
		// The injected factory hands back our fake subprocess instead of spawning a thread.
		context.app.bind(Identifiers.Evm.WorkerSubprocess.Factory).toConstantValue(() => context.ipc);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.p2pRepository);

		context.worker = context.app.resolve(Worker);
	});

	it("initialize subscribes to the peer added and removed events", ({ app, eventDispatcher }) => {
		// initialize() ran during resolve() in beforeEach; assert its side effects on a fresh resolve.
		const listen = spy(eventDispatcher, "listen");
		const fresh = app.resolve(Worker);

		listen.calledTimes(2);
		listen.calledNthWith(0, Events.PeerEvent.Added, fresh);
		listen.calledNthWith(1, Events.PeerEvent.Removed, fresh);
	});

	it("boot sends a single boot request and memoizes it", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");
		const flags = { thread: "evm-api" } as any;

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

	it("registerEventHandler forwards to the subprocess", ({ worker, ipc }) => {
		const register = spy(ipc, "registerEventHandler");
		const callback = () => {};

		worker.registerEventHandler("some-event", callback);

		register.calledWith("some-event", callback);
	});

	it("start requests start with the block number", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.boot({});
		await worker.start(42);

		sendRequest.calledWith("start", 42);
	});

	it("onCommit requests commit with the unit block number", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.boot({});
		await worker.onCommit({ blockNumber: 99 } as any);

		sendRequest.calledWith("commit", 99);
	});

	it("setPeerCount requests setPeerCount with the count", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.boot({});
		await worker.setPeerCount(5);

		sendRequest.calledWith("setPeerCount", 5);
	});

	it("handle relays the current peer count to the subprocess", async ({ worker, ipc, p2pRepository }) => {
		p2pRepository.getPeers = () => [{}, {}, {}];
		const sendRequest = spy(ipc, "sendRequest");

		await worker.boot({});
		await worker.handle({ data: {}, name: "peer.added" });

		sendRequest.calledWith("setPeerCount", 3);
	});
});

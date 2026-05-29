import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { Worker } from "./worker";

describe<{
	app: Application;
	worker: Worker;
	ipc: any;
	configuration: any;
	eventDispatcher: any;
}>("Worker", ({ assert, beforeEach, it, spy, stub, clock }) => {
	beforeEach((context) => {
		context.ipc = {
			dispose: async () => 0,
			drain: async () => {},
			getQueueSize: () => 3,
			kill: async () => 7,
			registerEventHandler: () => {},
			sendRequest: async () => {},
		};
		context.configuration = { getMilestone: () => ({ timeouts: { blockTime: 8000 } }) };
		context.eventDispatcher = { listen: () => {} };

		context.app = new Application();
		// The injected factory hands back our fake subprocess instead of spawning a thread.
		context.app.bind(Identifiers.TransactionPool.WorkerSubprocess.Factory).toConstantValue(() => context.ipc);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);

		context.worker = context.app.resolve(Worker);
	});

	it("initialize subscribes to the webhook events", ({ app, eventDispatcher }) => {
		// initialize() ran during resolve() in beforeEach; assert its side effects on a fresh resolve.
		const listen = spy(eventDispatcher, "listen");
		const fresh = app.resolve(Worker);

		listen.calledTimes(3);
		listen.calledNthWith(0, Events.WebhookEvent.Created, fresh);
		listen.calledNthWith(1, Events.WebhookEvent.Updated, fresh);
		listen.calledNthWith(2, Events.WebhookEvent.Removed, fresh);
	});

	it("boot sends a single boot request and memoizes it", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");
		const flags = { thread: "transaction-pool" } as any;

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

		await worker.start(42);

		sendRequest.calledWith("start", 42);
	});

	it("getTransactions requests and returns the batch", async ({ worker, ipc }) => {
		const batch = { transactions: [Buffer.from("tx")] };
		const sendRequest = stub(ipc, "sendRequest").resolvedValue(batch);
		const options = { limit: 5 } as any;

		const result = await worker.getTransactions(options);

		sendRequest.calledWith("getTransactions", options);
		assert.equal(result, batch);
	});

	it("removeTransaction requests removal by address and id", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.removeTransaction("address-1", "hash-1");

		sendRequest.calledWith("removeTransaction", "address-1", "hash-1");
	});

	it("setPeer requests the peer by ip", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.setPeer("127.0.0.1");

		sendRequest.calledWith("setPeer", "127.0.0.1");
	});

	it("forgetPeer requests forgetting the peer by ip", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.forgetPeer("127.0.0.1");

		sendRequest.calledWith("forgetPeer", "127.0.0.1");
	});

	it("reloadWebhooks requests a webhook reload", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.reloadWebhooks();

		sendRequest.calledWith("reloadWebhooks");
	});

	it("handle reloads webhooks", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.handle({ data: {}, name: "webhooks.created" });

		sendRequest.calledWith("reloadWebhooks");
	});

	it("onCommit commits sender addresses, gas used and a not-syncing flag for a recent block", async ({
		worker,
		ipc,
	}) => {
		const now = 1_700_000_000_000;
		clock(now);
		const sendRequest = spy(ipc, "sendRequest");

		const unit = {
			blockNumber: 100,
			getBlock: () => ({
				gasUsed: 21_000,
				timestamp: now, // recent → not syncing
				transactions: [{ from: "alice" }, { from: "bob" }, { from: "alice" }],
			}),
		} as any;

		await worker.onCommit(unit);

		// Duplicate senders collapse via the Set.
		sendRequest.calledWith("commit", 100, ["alice", "bob"], 21_000, false);
	});

	it("onCommit flags syncing when the block is older than three block times", async ({ worker, ipc }) => {
		const now = 1_700_000_000_000;
		clock(now);
		const sendRequest = spy(ipc, "sendRequest");

		const unit = {
			blockNumber: 100,
			getBlock: () => ({
				gasUsed: 0,
				timestamp: now - 8000 * 3 - 1, // older than 3 * blockTime → syncing
				transactions: [{ from: "alice" }],
			}),
		} as any;

		await worker.onCommit(unit);

		sendRequest.calledWith("commit", 100, ["alice"], 0, true);
	});
});

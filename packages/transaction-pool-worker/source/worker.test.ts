import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { Worker } from "./worker";

const makeIpc = () => {
	const ipc = {
		dispose: async () => 0,
		drain: async () => {},
		getQueueSize: () => 3,
		isStopped: () => false,
		kill: async () => 7,
		registerEventHandler: (..._: unknown[]) => {},
		requests: [] as unknown[][],
		respond: async (..._: unknown[]): Promise<unknown> => undefined,
		sendRequest: async (...arguments_: unknown[]): Promise<unknown> => {
			ipc.requests.push(arguments_);

			return ipc.respond(...arguments_);
		},
	};

	return ipc;
};

const makeUnit = (blockNumber: number) =>
	({
		blockNumber,
		getBlock: () => ({ gasUsed: 0, timestamp: Date.now(), transactions: [] }),
	}) as any;

const deferred = () => {
	let resolve!: (value?: unknown) => void;
	let reject!: (error: Error) => void;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, reject, resolve };
};

const within = async <T>(promise: Promise<T>): Promise<T> =>
	Promise.race([
		promise,
		new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request did not settle in time")), 500)),
	]);

const waitFor = async (condition: () => boolean) => {
	const startedAt = Date.now();

	while (!condition()) {
		if (Date.now() - startedAt > 1000) {
			throw new Error("Condition not met in time");
		}

		await new Promise((resolve) => setImmediate(resolve));
	}
};

describe<{
	app: Application;
	worker: Worker;
	ipc: ReturnType<typeof makeIpc>;
	subprocesses: ReturnType<typeof makeIpc>[];
	spawned: number;
	configuration: any;
	eventDispatcher: any;
	logs: string[][];
	terminations: unknown[][];
}>("Worker", ({ assert, beforeEach, it, spy, stub, clock }) => {
	beforeEach((context) => {
		context.ipc = makeIpc();
		context.subprocesses = [context.ipc];
		context.spawned = 0;
		context.configuration = { getMilestone: () => ({ timeouts: { blockTime: 8000 } }) };
		context.eventDispatcher = { listen: () => {} };
		context.logs = [];
		const log = (level: string) => (message: string) => context.logs.push([level, message]);

		context.app = new Application();
		// The injected factory hands back our fake subprocess instead of spawning a thread.
		context.app.bind(Identifiers.TransactionPool.WorkerSubprocess.Factory).toConstantValue(() => {
			context.spawned++;

			return context.subprocesses.shift() ?? makeIpc();
		});
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.eventDispatcher);
		context.app
			.bind(Identifiers.Services.Log.Service)
			.toConstantValue({ error: log("error"), info: log("info"), warn: log("warn") });

		context.terminations = [];
		stub(context.app, "terminate").callsFake(async (...arguments_) => void context.terminations.push(arguments_));

		context.worker = context.app.resolve(Worker);
	});

	const startWorker = async (worker: Worker, flags = { thread: "transaction-pool" } as any) => {
		await worker.boot(flags);
		await worker.start(10);
	};

	const stopIpc = (ipc: ReturnType<typeof makeIpc>) => {
		ipc.isStopped = () => true;
		ipc.respond = async () => {
			throw new Error("Worker stopped with exit code 1");
		};
	};

	const respawned = (logs: string[][], times = 1) =>
		logs.filter(([level, message]) => level === "info" && message === "Respawned the transaction pool worker")
			.length === times;

	const addReplacement = (subprocesses: ReturnType<typeof makeIpc>[]) => {
		const replacement = makeIpc();
		subprocesses.push(replacement);

		return replacement;
	};

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

		await worker.boot({});
		await worker.start(42);

		sendRequest.calledWith("start", 42);
	});

	it("getTransactions requests and returns the batch", async ({ worker, ipc }) => {
		const batch = { remaining: 0, transactions: [] };
		const sendRequest = stub(ipc, "sendRequest").resolvedValue(batch);
		const options = { blockRound: "0", maxBytes: 1024, maxSize: 100 };

		await worker.boot({});
		const result = await worker.getTransactions(options);

		sendRequest.calledWith("getTransactions", options);
		assert.equal(result, batch);
	});

	it("removeTransaction requests removal by address and id", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.boot({});
		await worker.removeTransaction("address-1", "hash-1");

		sendRequest.calledWith("removeTransaction", "address-1", "hash-1");
	});

	it("setPeer requests the peer by ip", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.boot({});
		await worker.setPeer("127.0.0.1");

		sendRequest.calledWith("setPeer", "127.0.0.1");
	});

	it("forgetPeer requests forgetting the peer by ip", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.boot({});
		await worker.forgetPeer("127.0.0.1");

		sendRequest.calledWith("forgetPeer", "127.0.0.1");
	});

	it("reloadWebhooks requests a webhook reload", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.boot({});
		await worker.reloadWebhooks();

		sendRequest.calledWith("reloadWebhooks");
	});

	it("handle reloads webhooks", async ({ worker, ipc }) => {
		const sendRequest = spy(ipc, "sendRequest");

		await worker.boot({});
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

		await worker.boot({});
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

		await worker.boot({});
		await worker.onCommit(unit);

		sendRequest.calledWith("commit", 100, ["alice"], 0, true);
	});

	it("onCommit respawns a stopped worker at the committed block and restores handlers and peers", async ({
		app,
		worker,
		ipc,
		subprocesses,
		logs,
	}) => {
		const flags = { thread: "transaction-pool" } as any;
		const callback = () => {};
		worker.registerEventHandler("peer.removed", callback);
		await startWorker(worker, flags);

		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({
			getPeers: () => [{ ip: "1.1.1.1" }, { ip: "2.2.2.2" }],
		});
		const replacement = addReplacement(subprocesses);
		const register = spy(replacement, "registerEventHandler");
		const kill = spy(ipc, "kill");
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => respawned(logs));

		kill.calledOnce();
		register.calledWith("peer.removed", callback);
		assert.equal(replacement.requests, [
			["boot", flags],
			["start", 11],
			["setPeer", "1.1.1.1"],
			["setPeer", "2.2.2.2"],
		]);
		assert.equal(ipc.requests, [
			["boot", flags],
			["start", 10],
		]);
		assert.true(
			logs.some(([level, message]) => level === "warn" && message === "Respawning the transaction pool worker"),
		);
	});

	it("onCommit respawns when the worker dies during the commit", async ({ worker, ipc, subprocesses, logs }) => {
		await startWorker(worker);

		const replacement = addReplacement(subprocesses);
		ipc.respond = async (method) => {
			if (method === "commit") {
				stopIpc(ipc);
				throw new Error("Worker stopped with exit code 1");
			}
		};

		await assert.resolves(() => worker.onCommit(makeUnit(11)));
		await waitFor(() => respawned(logs));

		assert.equal(replacement.requests[1], ["start", 11]);
	});

	it("onCommit still fails when a running worker rejects the commit", async (context) => {
		const { worker, ipc } = context;
		await startWorker(worker);
		ipc.respond = async () => {
			throw new Error("commit failed");
		};

		await assert.rejects(() => worker.onCommit(makeUnit(11)), "commit failed");
		assert.equal(context.spawned, 1);
	});

	it("skips every request while the worker respawns and restarts it at the latest block", async ({
		worker,
		ipc,
		subprocesses,
		logs,
	}) => {
		await startWorker(worker);

		const boot = deferred();
		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => (method === "boot" ? boot.promise : undefined);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => replacement.requests.length === 1);

		assert.equal(await within(worker.getTransactions({ blockRound: "12-0", maxBytes: 1024, maxSize: 100 })), {
			remaining: 0,
			transactions: [],
		});
		await within(worker.removeTransaction("address-1", "hash-1"));
		await within(worker.setPeer("1.1.1.1"));
		await within(worker.forgetPeer("1.1.1.1"));
		await within(worker.reloadWebhooks());
		await within(worker.onCommit(makeUnit(12)));

		assert.length(replacement.requests, 1);

		boot.resolve();
		await waitFor(() => respawned(logs));

		assert.equal(replacement.requests[1], ["start", 12]);
	});

	it("forwards commits that arrive while the respawned worker reloads the pool", async ({
		worker,
		ipc,
		subprocesses,
		logs,
	}) => {
		await startWorker(worker);

		const start = deferred();
		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => (method === "start" ? start.promise : undefined);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => replacement.requests.length === 2);

		const commit = worker.onCommit(makeUnit(12));
		await waitFor(() => replacement.requests.length === 3);

		assert.equal(replacement.requests[2][0], "commit");
		assert.equal(replacement.requests[2][1], 12);

		start.resolve();
		await commit;
		await waitFor(() => respawned(logs));
	});

	it("starts the respawn from any request that finds the worker stopped", async (context) => {
		const { worker, ipc, subprocesses, logs } = context;
		await startWorker(worker);

		const replacement = addReplacement(subprocesses);
		stopIpc(ipc);

		assert.equal(await worker.getTransactions({ blockRound: "11-0", maxBytes: 1024, maxSize: 100 }), {
			remaining: 0,
			transactions: [],
		});
		await waitFor(() => respawned(logs));

		assert.equal(context.spawned, 2);
		assert.equal(replacement.requests[1], ["start", 10]);
	});

	it("returns an empty batch when the worker dies during getTransactions", async ({
		worker,
		ipc,
		subprocesses,
		logs,
	}) => {
		await startWorker(worker);
		addReplacement(subprocesses);
		ipc.respond = async () => {
			stopIpc(ipc);
			throw new Error("Worker stopped with exit code 1");
		};

		assert.equal(await worker.getTransactions({ blockRound: "11-0", maxBytes: 1024, maxSize: 100 }), {
			remaining: 0,
			transactions: [],
		});
		await waitFor(() => respawned(logs));
	});

	it("respawns only once while a respawn is in progress", async (context) => {
		const { worker, ipc, subprocesses, logs } = context;
		await startWorker(worker);

		const boot = deferred();
		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => (method === "boot" ? boot.promise : undefined);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await within(worker.onCommit(makeUnit(12)));
		await within(worker.setPeer("1.1.1.1"));

		boot.resolve();
		await waitFor(() => respawned(logs));

		assert.equal(context.spawned, 2);
	});

	it("respawns the worker again when the replacement dies", async (context) => {
		const { worker, ipc, subprocesses, logs } = context;
		await startWorker(worker);

		const replacement = addReplacement(subprocesses);
		addReplacement(subprocesses);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => respawned(logs));

		stopIpc(replacement);
		await worker.onCommit(makeUnit(12));
		await waitFor(() => respawned(logs, 2));

		assert.equal(context.spawned, 3);
	});

	for (const failing of ["boot", "start"]) {
		it(`terminates the node when the respawned worker fails to ${failing}`, async ({
			worker,
			ipc,
			subprocesses,
			terminations,
		}) => {
			await startWorker(worker);

			const error = new Error(`${failing} failed`);
			const replacement = addReplacement(subprocesses);
			replacement.respond = async (method) => {
				if (method === failing) {
					throw error;
				}
			};
			stopIpc(ipc);

			await worker.onCommit(makeUnit(11));
			await waitFor(() => terminations.length === 1);

			assert.equal(terminations[0], ["tx-pool worker failed to respawn", error]);
		});
	}

	it("does not terminate the node when a respawn fails during shutdown", async ({
		worker,
		ipc,
		subprocesses,
		terminations,
	}) => {
		await startWorker(worker);

		const boot = deferred();
		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => (method === "boot" ? boot.promise : undefined);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => replacement.requests.length === 1);
		const disposed = worker.dispose();
		boot.reject(new Error("Worker is being disposed"));
		await disposed;
		await new Promise((resolve) => setTimeout(resolve, 10));

		assert.length(terminations, 0);
	});

	it("restores no peers when p2p is not registered", async ({ worker, ipc, subprocesses, logs }) => {
		await startWorker(worker);

		const replacement = addReplacement(subprocesses);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => respawned(logs));

		assert.equal(
			replacement.requests.map(([method]) => method),
			["boot", "start"],
		);
	});

	for (const [label, prepare] of [
		["before it started", async (worker: Worker) => worker.boot({})],
		["while it is disposed", async (worker: Worker) => startWorker(worker).then(() => worker.dispose())],
		[
			"after it was killed",
			async (worker: Worker) => startWorker(worker).then(async () => void (await worker.kill())),
		],
	] as const) {
		it(`drops requests without respawning the worker ${label}`, async (context) => {
			const { worker, ipc } = context;

			await prepare(worker);
			stopIpc(ipc);

			await assert.resolves(() => worker.onCommit(makeUnit(11)));
			assert.equal(await worker.getTransactions({ blockRound: "11-0", maxBytes: 1024, maxSize: 100 }), {
				remaining: 0,
				transactions: [],
			});
			assert.equal(context.spawned, 1);
		});
	}
});

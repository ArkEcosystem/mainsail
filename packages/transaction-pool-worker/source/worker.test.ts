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

const { clearTimeout: realClearTimeout, setTimeout: realSetTimeout } = globalThis;

const within = async <T>(promise: Promise<T>): Promise<T> => {
	let timeout: ReturnType<typeof setTimeout> | undefined;

	try {
		return await Promise.race([
			promise,
			new Promise<T>((_, reject) => {
				timeout = realSetTimeout(() => reject(new Error("Request did not settle in time")), 500);
			}),
		]);
	} finally {
		realClearTimeout(timeout);
	}
};

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
	spawned: ReturnType<typeof makeIpc>[];
	configuration: any;
	eventDispatcher: any;
	logs: string[][];
	terminations: unknown[][];
}>("Worker", ({ assert, beforeEach, it, spy, stub, clock }) => {
	beforeEach((context) => {
		context.ipc = makeIpc();
		context.subprocesses = [context.ipc];
		context.spawned = [];
		context.configuration = { getMilestone: () => ({ timeouts: { blockTime: 8000 } }) };
		context.eventDispatcher = { listen: () => {} };
		context.logs = [];
		const log = (level: string) => (message: string) => context.logs.push([level, message]);

		context.app = new Application();
		// The injected factory hands back our fake subprocess instead of spawning a thread.
		context.app.bind(Identifiers.TransactionPool.WorkerSubprocess.Factory).toConstantValue(() => {
			const subprocess = context.subprocesses.shift() ?? makeIpc();
			context.spawned.push(subprocess);

			return subprocess;
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

	it("onCommit returns before the worker finishes the commit", async ({ worker, ipc }) => {
		await startWorker(worker);
		const commit = deferred();
		ipc.respond = async (method) => (method === "commit" ? commit.promise : undefined);

		await within(worker.onCommit(makeUnit(11)));
		await waitFor(() => ipc.requests.length === 3);

		assert.equal(ipc.requests[2][0], "commit");
		commit.resolve();
	});

	for (const [label, request] of [
		[
			"getTransactions",
			(worker: Worker) => worker.getTransactions({ blockRound: "12-0", maxBytes: 1024, maxSize: 100 }),
		],
		["the next commit", (worker: Worker) => worker.onCommit(makeUnit(12))],
	] as const) {
		it(`${label} waits for the pending commit`, async ({ worker, ipc }) => {
			await startWorker(worker);
			const commit = deferred();
			ipc.respond = async (method, blockNumber) =>
				method === "commit" && blockNumber === 11 ? commit.promise : undefined;

			await within(worker.onCommit(makeUnit(11)));
			const pending = request(worker);
			await new Promise((resolve) => setTimeout(resolve, 10));

			assert.length(ipc.requests, 3);

			commit.resolve();
			await within(pending);
			await waitFor(() => ipc.requests.length === 4);
		});
	}

	it("start waits for the pending commit", async ({ worker, ipc }) => {
		await worker.boot({});
		const commit = deferred();
		ipc.respond = async (method) => (method === "commit" ? commit.promise : undefined);

		await within(worker.onCommit(makeUnit(0)));
		const start = worker.start(0);
		await new Promise((resolve) => setTimeout(resolve, 10));

		assert.equal(
			ipc.requests.map(([method]) => method),
			["boot", "commit"],
		);

		commit.resolve();
		await within(start);

		assert.equal(ipc.requests[2], ["start", 0]);
	});

	it("sends overlapping commits one after the other", async ({ worker, ipc }) => {
		await startWorker(worker);
		const pending = new Map<unknown, ReturnType<typeof deferred>>([
			[11, deferred()],
			[12, deferred()],
		]);
		ipc.respond = async (method, blockNumber) =>
			method === "commit" ? pending.get(blockNumber)?.promise : undefined;
		const sent = () => ipc.requests.filter(([method]) => method === "commit").map(([, blockNumber]) => blockNumber);

		await within(worker.onCommit(makeUnit(11)));
		const commit12 = worker.onCommit(makeUnit(12));
		const commit13 = worker.onCommit(makeUnit(13));

		pending.get(11)?.resolve();
		await within(commit12);
		await new Promise((resolve) => setTimeout(resolve, 10));

		assert.equal(sent(), [11, 12]);

		pending.get(12)?.resolve();
		await within(commit13);
		await waitFor(() => sent().length === 3);

		assert.equal(sent(), [11, 12, 13]);
	});

	it("respawns the worker when a commit does not finish in time", async ({ worker, ipc, subprocesses, logs }) => {
		await startWorker(worker);
		const fake = clock({ toFake: ["setTimeout", "clearTimeout"] });
		const commit = deferred();
		ipc.respond = async (method) => (method === "commit" ? commit.promise : undefined);
		ipc.kill = async () => {
			stopIpc(ipc);
			commit.reject(new Error("Worker was killed"));

			return 1;
		};
		const replacement = addReplacement(subprocesses);

		await within(worker.onCommit(makeUnit(11)));
		await fake.tickAsync(29_999);

		assert.length(replacement.requests, 0);

		await fake.tickAsync(1);
		fake.restore();
		await waitFor(() => respawned(logs));

		assert.equal(replacement.requests[1], ["start", 11]);
		await within(worker.getTransactions({ blockRound: "12-0", maxBytes: 1024, maxSize: 100 }));
	});

	it("keeps the worker when a commit finishes in time", async ({ worker, logs, spawned }) => {
		await startWorker(worker);
		const fake = clock({ toFake: ["setTimeout", "clearTimeout"] });

		await within(worker.onCommit(makeUnit(11)));
		await within(worker.getTransactions({ blockRound: "12-0", maxBytes: 1024, maxSize: 100 }));
		await fake.tickAsync(30_000);
		fake.restore();

		assert.length(spawned, 1);
		assert.length(logs, 0);
	});

	it("keeps the replacement when a commit times out while it reloads the pool", async ({
		worker,
		ipc,
		subprocesses,
		terminations,
		logs,
		spawned,
	}) => {
		await startWorker(worker);

		const reload = deferred();
		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => (method === "boot" ? undefined : reload.promise);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => replacement.requests.length === 2);
		const fake = clock({ toFake: ["setTimeout", "clearTimeout"] });

		await within(worker.onCommit(makeUnit(12)));
		await fake.tickAsync(30_000);
		fake.restore();

		assert.length(spawned, 2);
		assert.length(terminations, 0);

		reload.resolve();
		await waitFor(() => respawned(logs));
	});

	it("restarts the commit timeout once the replacement has reloaded the pool", async ({
		worker,
		ipc,
		subprocesses,
		logs,
		spawned,
	}) => {
		await startWorker(worker);

		const start = deferred();
		const commit = deferred();
		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => {
			if (method === "start") {
				return start.promise;
			}

			return method === "commit" ? commit.promise : undefined;
		};
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => replacement.requests.length === 2);
		const fake = clock({ toFake: ["setTimeout", "clearTimeout"] });

		await within(worker.onCommit(makeUnit(12)));
		await waitFor(() => replacement.requests.length === 3);
		await fake.tickAsync(25_000);
		start.resolve();
		await waitFor(() => respawned(logs));
		await fake.tickAsync(5_000);

		assert.length(spawned, 2);
		assert.length(
			logs.filter(([, message]) => message === "Respawning the transaction pool worker"),
			1,
		);

		await fake.tickAsync(25_000);
		await waitFor(() => spawned.length === 3);
		fake.restore();

		await waitFor(() => respawned(logs, 2));
		assert.equal(spawned[2].requests[1], ["start", 12]);
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

	it("onCommit terminates the node when a running worker rejects the commit", async ({
		worker,
		ipc,
		terminations,
		spawned,
	}) => {
		await startWorker(worker);
		const error = new Error("commit failed");
		ipc.respond = async (method) => {
			if (method === "commit") {
				throw error;
			}
		};

		await assert.resolves(() => worker.onCommit(makeUnit(11)));
		await waitFor(() => terminations.length === 1);

		assert.equal(terminations[0], ["tx-pool worker failed to commit", error]);
		assert.length(spawned, 1);
	});

	it("respawns no more once a failed commit terminates the node", async ({ worker, ipc, terminations, spawned }) => {
		await startWorker(worker);
		ipc.respond = async (method) => {
			if (method === "commit") {
				throw new Error("commit failed");
			}
		};

		await worker.onCommit(makeUnit(11));
		await waitFor(() => terminations.length === 1);
		stopIpc(ipc);

		assert.equal(await worker.getTransactions({ blockRound: "12-0", maxBytes: 1024, maxSize: 100 }), {
			remaining: 0,
			transactions: [],
		});
		await new Promise((resolve) => setTimeout(resolve, 10));
		assert.length(spawned, 1);
	});

	it("does not terminate the node when a commit fails during shutdown", async ({ worker, ipc, terminations }) => {
		await startWorker(worker);
		const commit = deferred();
		ipc.respond = async (method) => (method === "commit" ? commit.promise : undefined);

		await within(worker.onCommit(makeUnit(11)));
		const disposed = worker.dispose();
		commit.reject(new Error("pool disposed"));
		await within(disposed);
		await new Promise((resolve) => setTimeout(resolve, 10));

		assert.length(terminations, 0);
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

	it("restores peers while the respawned worker reloads the pool", async ({
		app,
		worker,
		ipc,
		subprocesses,
		logs,
	}) => {
		await startWorker(worker);

		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({ getPeers: () => [{ ip: "1.1.1.1" }] });
		const start = deferred();
		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => (method === "start" ? start.promise : undefined);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => replacement.requests.length === 3);

		assert.equal(replacement.requests[2], ["setPeer", "1.1.1.1"]);
		assert.false(respawned(logs));

		start.resolve();
		await waitFor(() => respawned(logs));
	});

	it("starts the respawn from any request that finds the worker stopped", async ({
		worker,
		ipc,
		subprocesses,
		logs,
		spawned,
	}) => {
		await startWorker(worker);

		const replacement = addReplacement(subprocesses);
		stopIpc(ipc);

		assert.equal(await worker.getTransactions({ blockRound: "11-0", maxBytes: 1024, maxSize: 100 }), {
			remaining: 0,
			transactions: [],
		});
		await waitFor(() => respawned(logs));

		assert.length(spawned, 2);
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

	it("respawns only once while a respawn is in progress", async ({ worker, ipc, subprocesses, logs, spawned }) => {
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

		assert.length(spawned, 2);
	});

	it("respawns the worker again when the replacement dies", async ({ worker, ipc, subprocesses, logs, spawned }) => {
		await startWorker(worker);

		const replacement = addReplacement(subprocesses);
		addReplacement(subprocesses);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => respawned(logs));

		stopIpc(replacement);
		await worker.onCommit(makeUnit(12));
		await waitFor(() => respawned(logs, 2));

		assert.length(spawned, 3);
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

	it("drops requests after the respawned worker fails to boot", async ({
		worker,
		ipc,
		subprocesses,
		terminations,
	}) => {
		await startWorker(worker);

		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => {
			if (method === "boot") {
				throw new Error("boot failed");
			}
		};
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => terminations.length === 1);

		await assert.resolves(() => worker.setPeer("1.1.1.1"));
		assert.equal(await worker.getTransactions({ blockRound: "12-0", maxBytes: 1024, maxSize: 100 }), {
			remaining: 0,
			transactions: [],
		});
		assert.equal(
			replacement.requests.map(([method]) => method),
			["boot"],
		);
	});

	it("respawns no more once a failed respawn terminates the node", async ({
		app,
		worker,
		ipc,
		subprocesses,
		terminations,
		spawned,
	}) => {
		await startWorker(worker);

		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue({ getPeers: () => [{ ip: "1.1.1.1" }] });
		const exit = deferred();
		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => (method === "boot" ? undefined : exit.promise);
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => replacement.requests.length === 3);

		stopIpc(replacement);
		exit.reject(new Error("Worker stopped with exit code 1"));
		await waitFor(() => terminations.length === 1);
		await worker.onCommit(makeUnit(12));
		await new Promise((resolve) => setTimeout(resolve, 10));

		assert.length(spawned, 2);
	});

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

	it("creates no replacement when the worker is disposed while the respawn kills it", async ({
		worker,
		ipc,
		spawned,
	}) => {
		await startWorker(worker);

		const kill = deferred();
		ipc.kill = async () => {
			await kill.promise;

			return 0;
		};
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		const disposed = worker.dispose();
		kill.resolve();
		await within(disposed);

		assert.length(spawned, 1);
	});

	it("disposes the replacement without starting it when the worker is disposed while the respawn boots it", async ({
		worker,
		ipc,
		subprocesses,
	}) => {
		await startWorker(worker);

		const boot = deferred();
		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => (method === "boot" ? boot.promise : undefined);
		const dispose = spy(replacement, "dispose");
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => replacement.requests.length === 1);
		const disposed = worker.dispose();
		await new Promise((resolve) => setImmediate(resolve));

		dispose.neverCalled();

		boot.resolve();
		await within(disposed);

		assert.equal(
			replacement.requests.map(([method]) => method),
			["boot", "dispose"],
		);
		dispose.calledOnce();
	});

	it("disposes the worker when a failed respawn terminates the node", async ({ app, worker, ipc, subprocesses }) => {
		await startWorker(worker);

		const replacement = addReplacement(subprocesses);
		replacement.respond = async (method) => {
			if (method === "start") {
				throw new Error("start failed");
			}
		};
		const dispose = spy(replacement, "dispose");
		let disposed: Promise<void> | undefined;
		app.terminate = async () => {
			disposed = worker.dispose();
			await disposed;

			return new Promise<never>(() => {});
		};
		stopIpc(ipc);

		await worker.onCommit(makeUnit(11));
		await waitFor(() => disposed !== undefined);
		await within(disposed!);

		dispose.calledOnce();
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
		it(`drops requests without respawning the worker ${label}`, async ({ worker, ipc, spawned }) => {
			await prepare(worker);
			stopIpc(ipc);

			await assert.resolves(() => worker.onCommit(makeUnit(11)));
			assert.equal(await worker.getTransactions({ blockRound: "11-0", maxBytes: 1024, maxSize: 100 }), {
				remaining: 0,
				transactions: [],
			});
			assert.length(spawned, 1);
		});
	}
});

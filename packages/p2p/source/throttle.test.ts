import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Throttle } from "./throttle";

const makePeer = (ip: string): any => ({ ip });

// A serial queue like the kernel memory queue: jobs run one after another.
const makeQueue = () => {
	let chain = Promise.resolve();

	const queue = {
		isStarted: () => queue.started,
		push: (job: { handle: () => Promise<void> }) => {
			queue.pushed++;
			chain = chain.then(() => job.handle());
			return chain;
		},
		pushed: 0,
		start: async () => {
			queue.started = true;
		},
		started: false,
		stop: async () => {
			queue.started = false;
		},
	};

	return queue;
};

describe<{
	throttle: Throttle;
	queue: ReturnType<typeof makeQueue>;
	clk: any;
}>("Throttle", ({ it, beforeEach, afterEach, assert, clock }) => {
	beforeEach(async (context) => {
		// The rate limiter derives refill times from Date.now() and the backoff
		// uses setTimeout; fake both so waits are deterministic.
		context.clk = clock({ now: 1_000_000, toFake: ["Date", "setTimeout"] });

		context.queue = makeQueue();

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: () => 100 })
			.whenTagged("plugin", "p2p");
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({ getMaxRoundValidators: () => 5 });
		app.bind(Identifiers.Services.Queue.Factory).toConstantValue(async () => context.queue);
		app.bind(Identifiers.Services.Log.Service).toConstantValue({ debug: () => {} });

		context.throttle = await app.resolve(Throttle).initialize();
	});

	afterEach(({ clk }) => {
		clk.restore();
	});

	it("allows sends within the budget immediately", async ({ throttle, queue }) => {
		await throttle.throttle(makePeer("1.1.1.1"), "getStatus");

		assert.equal(queue.pushed, 1);
	});

	it("defers a send that exceeds the endpoint budget until it actually refills", async ({ throttle, queue, clk }) => {
		const peer = makePeer("1.1.1.1");

		// getStatus allows 2 per second.
		await throttle.throttle(peer, "getStatus");
		await throttle.throttle(peer, "getStatus");

		let sent = false;
		void throttle.throttle(peer, "getStatus").then(() => {
			sent = true;
		});

		// The retry waits for the actual refill instead of polling: no
		// intermediate requeue happens before the budget is available again.
		await clk.tickAsync(900);
		assert.false(sent);
		assert.equal(queue.pushed, 3);

		await clk.tickAsync(101);
		assert.true(sent);
		assert.equal(queue.pushed, 4);
	});

	it("never head-of-line blocks other peers or endpoints behind a throttled send", async ({ throttle, clk }) => {
		const peerA = makePeer("1.1.1.1");
		const peerB = makePeer("2.2.2.2");

		// Exhaust peerA's getStatus budget and queue a throttled send.
		await throttle.throttle(peerA, "getStatus");
		await throttle.throttle(peerA, "getStatus");

		let throttledSent = false;
		void throttle.throttle(peerA, "getStatus").then(() => {
			throttledSent = true;
		});
		await clk.tickAsync(0);

		// Consensus-critical sends to the same peer and any send to other peers
		// must pass right through while the throttled one backs off.
		await throttle.throttle(peerA, "postMessage");
		await throttle.throttle(peerB, "getStatus");

		assert.false(throttledSent);

		await clk.tickAsync(1001);
		assert.true(throttledSent);
	});

	it("drops deferred sends once the queue has stopped", async ({ throttle, queue, clk }) => {
		const peer = makePeer("1.1.1.1");

		await throttle.throttle(peer, "getStatus");
		await throttle.throttle(peer, "getStatus");

		let sent = false;
		void throttle.throttle(peer, "getStatus").then(() => {
			sent = true;
		});
		await clk.tickAsync(0);

		const pushedBeforeStop = queue.pushed;
		await queue.stop();
		await clk.tickAsync(5000);

		assert.false(sent);
		assert.equal(queue.pushed, pushedBeforeStop);
	});
});

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { constants } from "./constants";
import { DialQueue } from "./dial-queue";

// Lets the dials that were started, and the ones their end starts, run.
const flush = async (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe<{
	dialQueue: DialQueue;
	repository: any;
	websocketService: any;
	logger: any;
	pending: Map<string, { resolve: () => void; reject: (error: Error) => void }>;
}>("DialQueue", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.pending = new Map();
		context.repository = { hasPeer: () => false };
		context.logger = { debug: () => {} };
		// Every dial stays in flight until the test settles it.
		context.websocketService = {
			dial: (url: string) =>
				new Promise<void>((resolve, reject) => {
					context.pending.set(url, { reject, resolve });
				}),
		};

		const app = new Application();
		app.bind(Identifiers.P2P.WebSocket.Service).toConstantValue(context.websocketService);
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Factory).toConstantValue((ip: string) => ({
			ip,
			port: 4002,
			socketUrl: `ws://${ip}:4002`,
		}));
		app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);

		context.dialQueue = app.resolve(DialQueue);
	});

	it("should dial an added address at once", ({ dialQueue, websocketService }) => {
		const dial = spy(websocketService, "dial");

		dialQueue.add("1.1.1.1");

		dial.calledOnce();
		dial.calledWith("ws://1.1.1.1:4002");
	});

	it("should dial the sanitized address", ({ dialQueue, websocketService }) => {
		const dial = spy(websocketService, "dial");

		dialQueue.add("::ffff:178.165.55.55");

		dial.calledWith("ws://178.165.55.55:4002");
	});

	it("should skip invalid addresses and peers the repository already holds", ({
		dialQueue,
		websocketService,
		repository,
	}) => {
		const dial = spy(websocketService, "dial");

		dialQueue.add("not-an-ip");
		repository.hasPeer = () => true;
		dialQueue.add("1.1.1.1");

		dial.neverCalled();
	});

	it("should not dial more than MAX_CONCURRENT_DIALS addresses at a time", async ({
		dialQueue,
		websocketService,
		pending,
	}) => {
		const dial = spy(websocketService, "dial");

		for (let index = 0; index < constants.MAX_CONCURRENT_DIALS + 2; index++) {
			dialQueue.add(`1.1.1.${index}`);
		}
		dial.calledTimes(constants.MAX_CONCURRENT_DIALS);

		// Every dial that ends, whatever the outcome, makes room for one that waits, first in first out.
		pending.get("ws://1.1.1.0:4002")?.resolve();
		await flush();
		dial.calledTimes(constants.MAX_CONCURRENT_DIALS + 1);
		dial.calledWith(`ws://1.1.1.${constants.MAX_CONCURRENT_DIALS}:4002`);

		pending.get("ws://1.1.1.1:4002")?.reject(new Error("ECONNREFUSED"));
		await flush();
		dial.calledTimes(constants.MAX_CONCURRENT_DIALS + 2);
	});

	it("should skip an address that is waiting or being dialed", async ({ dialQueue, websocketService, pending }) => {
		const dial = spy(websocketService, "dial");

		for (let index = 0; index < constants.MAX_CONCURRENT_DIALS + 1; index++) {
			dialQueue.add(`1.1.1.${index}`);
		}
		// One in flight, one waiting.
		dialQueue.add("1.1.1.0");
		dialQueue.add(`1.1.1.${constants.MAX_CONCURRENT_DIALS}`);

		for (const { resolve } of pending.values()) {
			resolve();
		}
		await flush();

		dial.calledTimes(constants.MAX_CONCURRENT_DIALS + 1);
	});

	it("should drop addresses once MAX_QUEUED_DIALS wait", async ({ dialQueue, websocketService, pending }) => {
		const dial = spy(websocketService, "dial");
		const accepted = constants.MAX_CONCURRENT_DIALS + constants.MAX_QUEUED_DIALS;

		for (let index = 0; index < accepted + 5; index++) {
			dialQueue.add(`1.1.${Math.floor(index / 250)}.${index % 250}`);
		}

		// Settle every dial, round after round, until none is started any more.
		while (pending.size > 0) {
			for (const [url, { resolve }] of pending) {
				pending.delete(url);
				resolve();
			}
			await flush();
		}

		dial.calledTimes(accepted);
	});

	it("should not dial an address that became a peer while it waited", async ({
		dialQueue,
		websocketService,
		repository,
		pending,
	}) => {
		const dial = spy(websocketService, "dial");

		for (let index = 0; index < constants.MAX_CONCURRENT_DIALS + 1; index++) {
			dialQueue.add(`1.1.1.${index}`);
		}
		repository.hasPeer = (ip: string) => ip === `1.1.1.${constants.MAX_CONCURRENT_DIALS}`;

		pending.get("ws://1.1.1.0:4002")?.resolve();
		await flush();

		dial.calledTimes(constants.MAX_CONCURRENT_DIALS);
	});

	it("should log a failed dial and carry on", async ({ dialQueue, logger, pending }) => {
		const debug = spy(logger, "debug");

		dialQueue.add("1.1.1.1");
		pending.get("ws://1.1.1.1:4002")?.reject(new Error("ECONNREFUSED"));
		await flush();

		debug.calledWith("Dial to 1.1.1.1 failed: ECONNREFUSED", "p2p");
	});

	it("should drop waiting addresses and accept no new ones once disposed", async ({
		dialQueue,
		websocketService,
		pending,
	}) => {
		const dial = spy(websocketService, "dial");

		for (let index = 0; index < constants.MAX_CONCURRENT_DIALS + 3; index++) {
			dialQueue.add(`1.1.1.${index}`);
		}
		dialQueue.dispose();
		dialQueue.add("2.2.2.2");

		for (const { resolve } of pending.values()) {
			resolve();
		}
		await flush();

		dial.calledTimes(constants.MAX_CONCURRENT_DIALS);
		assert.false(pending.has("ws://2.2.2.2:4002"));
	});
});

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { CloseReason, ConnectionError } from "@mainsail/p2p-websocket";

import { constants } from "./constants";
import { Service } from "./service";

const BLOCK_TIME = 8000;
// A header gets stale after this long without one from the peer.
const STALE_AFTER = constants.HEADER_STALE_AFTER_BLOCKS * BLOCK_TIME;

const makePeer = (ip: string, extra: Record<string, unknown> = {}): any => ({
	dialAttempts: 0,
	header: {},
	ip,
	lastDialAt: 0,
	port: 4002,
	socketUrl: `ws://${ip}:4002`,
	version: "0.0.1",
	...extra,
});

describe<{
	service: Service;
	repository: any;
	logger: any;
	peerDiscoverer: any;
	peerDisposer: any;
	communicator: any;
	seeds: any;
	dialQueue: any;
	websocketService: any;
}>("Service", ({ it, beforeEach, assert, clock, spy }) => {
	beforeEach((context) => {
		context.logger = { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} };
		context.repository = {
			forgetKnownPeer: () => {},
			getKnownPeers: () => [],
			getActivePeers: () => [],
			hasMinimumPeers: () => true,
			hasPendingPeer: () => false,
		};
		context.peerDiscoverer = { discoverPeers: async () => {}, populateSeedPeers: async () => {} };
		context.peerDisposer = { banPeer: () => {}, disposePeers: async () => {} };
		context.communicator = { getStatus: async () => ({}) };
		context.seeds = { load: async () => {} };
		context.dialQueue = { dispose: () => {} };
		context.websocketService = {
			boot: async () => {},
			dial: async () => {},
			dispose: async () => {},
			onConnection: undefined,
		};

		const app = new Application();
		app.bind(Identifiers.P2P.Peer.Discoverer).toConstantValue(context.peerDiscoverer);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		app.bind(Identifiers.P2P.Peer.Seeds).toConstantValue(context.seeds);
		app.bind(Identifiers.P2P.Peer.DialQueue).toConstantValue(context.dialQueue);
		app.bind(Identifiers.P2P.WebSocket.Service).toConstantValue(context.websocketService);
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Communicator).toConstantValue(context.communicator);
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({
			getMilestone: () => ({ timeouts: { blockTime: BLOCK_TIME } }),
		});
		app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.service = app.resolve(Service);
	});

	it("#mainLoop - should re-arm every 2 seconds until disposed", async ({ service, repository }) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const getKnownPeers = spy(repository, "getKnownPeers");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);
		getKnownPeers.calledTimes(1);

		await fakeTimers.tickAsync(2000);
		getKnownPeers.calledTimes(2);

		await fakeTimers.tickAsync(2000);
		getKnownPeers.calledTimes(3);

		assert.equal(fakeTimers.countTimers(), 1);
		await service.dispose();
		assert.equal(fakeTimers.countTimers(), 0);

		await fakeTimers.tickAsync(10_000);
		getKnownPeers.calledTimes(3);
	});

	it("#mainLoop - should not re-arm when disposed during an in-flight iteration", async ({
		service,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const known = [makePeer("1.1.1.1")];
		repository.getKnownPeers = () => known;

		let release!: () => void;
		websocketService.dial = () => new Promise<void>((resolve) => (release = resolve));

		// The iteration is now in flight, blocked on the dial.
		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		await service.dispose();

		release();
		await fakeTimers.tickAsync(0);

		// The finished iteration must not have armed a new loop timer.
		assert.equal(fakeTimers.countTimers(), 0);
	});

	it("#mainLoop - should fall back to seed peers when below the minimum, at most once per minute", async ({
		service,
		repository,
		peerDiscoverer,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		repository.hasMinimumPeers = () => false;
		repository.getActivePeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2")];
		const populateSeedPeers = spy(peerDiscoverer, "populateSeedPeers");
		const discoverPeers = spy(peerDiscoverer, "discoverPeers");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		// Throttled: the last check timestamp was set at construction.
		populateSeedPeers.neverCalled();

		await fakeTimers.tickAsync(61_000);
		populateSeedPeers.calledOnce();
		discoverPeers.calledTimes(2);

		await service.dispose();
	});

	it("#mainLoop - should ask the peers for their peers at the same time", async ({
		service,
		repository,
		peerDiscoverer,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		repository.hasMinimumPeers = () => false;
		repository.getActivePeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2")];
		// Never answers: a sequential loop would not get past the first peer.
		peerDiscoverer.discoverPeers = () => new Promise(() => {});
		const discoverPeers = spy(peerDiscoverer, "discoverPeers");

		void service.mainLoop();
		await fakeTimers.tickAsync(61_000);

		discoverPeers.calledTimes(2);

		await service.dispose();
	});

	it("#dispose - should stop the dialing of new addresses", async ({ service, dialQueue }) => {
		const dispose = spy(dialQueue, "dispose");

		await service.dispose();

		dispose.calledOnce();
	});

	it("#mainLoop - should log and re-arm when a check throws", async ({ service, repository, logger }) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const error = spy(logger, "error");

		let calls = 0;
		repository.getKnownPeers = () => {
			calls++;
			if (calls === 1) {
				throw new Error("boom");
			}

			return [];
		};

		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		error.calledWith("P2P main loop failed: boom", "p2p");
		assert.equal(calls, 1);

		// The loop survived the failure and ticked again.
		await fakeTimers.tickAsync(2000);
		assert.equal(calls, 2);

		await service.dispose();
	});

	it("#boot - should skip booting in the test environment", async ({ service, websocketService }) => {
		const previous = process.env.MAINSAIL_ENV;
		process.env.MAINSAIL_ENV = "test";

		try {
			const boot = spy(websocketService, "boot");

			await service.boot();

			boot.neverCalled();
		} finally {
			if (previous === undefined) {
				delete process.env.MAINSAIL_ENV;
			} else {
				process.env.MAINSAIL_ENV = previous;
			}
		}
	});

	it("#boot - should start the transport, populate and dial the seed peers and start the loop", async ({
		service,
		websocketService,
		peerDisposer,
		peerDiscoverer,
		repository,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const previous = process.env.MAINSAIL_ENV;
		delete process.env.MAINSAIL_ENV;

		try {
			const known = [makePeer("1.1.1.1")];
			repository.getKnownPeers = () => known;
			const boot = spy(websocketService, "boot");
			const populateSeedPeers = spy(peerDiscoverer, "populateSeedPeers");
			const dial = spy(websocketService, "dial");

			await service.boot();
			await fakeTimers.tickAsync(0);

			boot.calledOnce();
			populateSeedPeers.calledOnce();
			dial.calledOnce();
			dial.calledWith("ws://1.1.1.1:4002");

			// The loop timer is pending; dispose cancels it, disconnects the peers and then stops the transport.
			const calls: string[] = [];
			peerDisposer.disposePeers = async () => void calls.push("disposePeers");
			websocketService.dispose = async () => void calls.push("transport");
			assert.equal(fakeTimers.countTimers(), 1);
			await service.dispose();
			assert.equal(fakeTimers.countTimers(), 0);
			assert.equal(calls, ["disposePeers", "transport"]);
		} finally {
			await service.dispose();

			if (previous === undefined) {
				delete process.env.MAINSAIL_ENV;
			} else {
				process.env.MAINSAIL_ENV = previous;
			}
		}
	});

	it("#mainLoop - should ask the peers with a stale header for their status", async ({
		service,
		repository,
		communicator,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const fresh = makePeer("1.1.1.1", { lastHeaderAt: Date.now() - STALE_AFTER });
		const stale = makePeer("2.2.2.2", { lastHeaderAt: Date.now() - STALE_AFTER - 1 });
		repository.getActivePeers = () => [fresh, stale];
		const getStatus = spy(communicator, "getStatus");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		getStatus.calledOnce();
		getStatus.calledWith(stale);

		await service.dispose();
	});

	it("#mainLoop - should ask a few peers per turn, the oldest headers first", async ({
		service,
		repository,
		communicator,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		// The higher the address, the older the header.
		const peers = Array.from({ length: constants.HEADER_REFRESH_BATCH + 2 }, (_, index) =>
			makePeer(`1.1.1.${index}`, { lastHeaderAt: Date.now() - STALE_AFTER - 1 - index }),
		);
		repository.getActivePeers = () => peers;

		const asked: string[] = [];
		communicator.getStatus = async (peer: any) => {
			asked.push(peer.ip);
			// The answer brings a header.
			peer.lastHeaderAt = Date.now();
		};

		void service.mainLoop();
		await fakeTimers.tickAsync(0);
		assert.equal(asked, ["1.1.1.6", "1.1.1.5", "1.1.1.4", "1.1.1.3", "1.1.1.2"]);

		// The rest follow on the next turn.
		await fakeTimers.tickAsync(2000);
		assert.equal(asked.slice(constants.HEADER_REFRESH_BATCH), ["1.1.1.1", "1.1.1.0"]);

		await service.dispose();
	});

	it("#mainLoop - should not wait for the status and not ask a peer again while it is being asked", async ({
		service,
		repository,
		communicator,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const peer = makePeer("1.1.1.1", { lastHeaderAt: 0 });
		repository.getActivePeers = () => [peer];

		let answer!: () => void;
		let asked = 0;
		communicator.getStatus = () => {
			asked++;
			return new Promise<void>((resolve) => (answer = resolve));
		};

		// Asked for once per turn of the loop.
		const getKnownPeers = spy(repository, "getKnownPeers");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);
		assert.equal(asked, 1);
		getKnownPeers.calledTimes(1);

		// The loop went on without the answer, and leaves the peer alone while the request is out.
		await fakeTimers.tickAsync(4000);
		getKnownPeers.calledTimes(3);
		assert.equal(asked, 1);

		// An answer without a header leaves the peer stale: it is asked again.
		answer();
		await fakeTimers.tickAsync(2000);
		assert.equal(asked, 2);

		await service.dispose();
	});

	it("#mainLoop - should ban a peer whose status request fails", async ({
		service,
		repository,
		communicator,
		peerDisposer,
		logger,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		repository.getActivePeers = () => [makePeer("1.1.1.1", { lastHeaderAt: 0 })];
		const failure = new Error("boom");
		communicator.getStatus = async () => {
			throw failure;
		};
		const banPeer = spy(peerDisposer, "banPeer");
		const error = spy(logger, "error");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		// The disposer tells a failed connection, which it ignores, from a failure of the peer.
		banPeer.calledWith("1.1.1.1", failure);
		error.neverCalled();

		await service.dispose();
	});

	it("#getNetworkBlockNumberPercentile - should compute the percentile over peers reporting a block number", ({
		service,
		repository,
	}) => {
		repository.getActivePeers = () => [
			makePeer("1.1.1.1", { header: { blockNumber: 9 } }),
			makePeer("2.2.2.2", { header: { blockNumber: 3 } }),
			makePeer("3.3.3.3", { header: { blockNumber: 5 } }),
			makePeer("4.4.4.4", { header: {} }),
		];

		assert.equal(service.getNetworkBlockNumberPercentile(50), 5);
	});

	it("#mainLoop - should dial the known peers that are due and space the dials out", async ({
		service,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const known = [makePeer("1.1.1.1"), makePeer("2.2.2.2")];
		repository.getKnownPeers = () => known;
		const dial = spy(websocketService, "dial");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);
		dial.calledTimes(2);
		dial.calledWith("ws://1.1.1.1:4002");

		// Not due again within DIAL_SPACING.
		await fakeTimers.tickAsync(2000);
		dial.calledTimes(2);

		await fakeTimers.tickAsync(constants.DIAL_SPACING);
		dial.calledTimes(4);

		await service.dispose();
	});

	it("#mainLoop - should not dial a known peer that is pending", async ({
		service,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		repository.getKnownPeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2")];
		repository.hasPendingPeer = (ip: string) => ip === "1.1.1.1";
		const dial = spy(websocketService, "dial");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		dial.calledOnce();
		dial.calledWith("ws://2.2.2.2:4002");

		await service.dispose();
	});

	it("#mainLoop - should forget a known peer the transport refuses to dial", async ({
		service,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const peer = makePeer("1.1.1.1");
		repository.getKnownPeers = () => [peer];
		websocketService.dial = async () => {
			throw new ConnectionError(CloseReason.Banned, "refused");
		};
		const forgetKnownPeer = spy(repository, "forgetKnownPeer");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		forgetKnownPeer.calledWith(peer);

		await service.dispose();
	});

	it("#mainLoop - should forget a known peer whose software version does not fit ours", async ({
		service,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const peer = makePeer("1.1.1.1");
		repository.getKnownPeers = () => [peer];
		websocketService.dial = async () => {
			throw new ConnectionError(CloseReason.VersionMismatch, "refused");
		};
		const forgetKnownPeer = spy(repository, "forgetKnownPeer");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		forgetKnownPeer.calledWith(peer);

		await service.dispose();
	});

	it("#mainLoop - should give up a known peer after repeated failed dials", async ({
		service,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const peer = makePeer("1.1.1.1");
		const known = [peer];
		repository.getKnownPeers = () => [...known];
		repository.forgetKnownPeer = (forgotten: any) => known.splice(known.indexOf(forgotten), 1);
		websocketService.dial = async () => {
			throw new Error("ECONNREFUSED");
		};
		const dial = spy(websocketService, "dial");
		const forgetKnownPeer = spy(repository, "forgetKnownPeer");

		void service.mainLoop();
		await fakeTimers.tickAsync((constants.MAX_DIAL_ATTEMPTS - 1) * constants.DIAL_SPACING);

		// Nothing is given up before the next dial is due.
		dial.calledTimes(constants.MAX_DIAL_ATTEMPTS);
		forgetKnownPeer.neverCalled();

		await fakeTimers.tickAsync(constants.DIAL_SPACING);

		forgetKnownPeer.calledOnce();
		forgetKnownPeer.calledWith(peer);
		dial.calledTimes(constants.MAX_DIAL_ATTEMPTS);

		await service.dispose();
	});

	it("#mainLoop - should give up a known peer whose dials succeed but which never becomes active", async ({
		service,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const peer = makePeer("1.1.1.1");
		repository.getKnownPeers = () => [peer];
		const dial = spy(websocketService, "dial");
		const forgetKnownPeer = spy(repository, "forgetKnownPeer");

		void service.mainLoop();
		await fakeTimers.tickAsync(constants.MAX_DIAL_ATTEMPTS * constants.DIAL_SPACING);

		dial.calledTimes(constants.MAX_DIAL_ATTEMPTS);
		forgetKnownPeer.calledWith(peer);

		await service.dispose();
	});

	it("#mainLoop - should keep dialing a known peer the processor made active in between", async ({
		service,
		repository,
		websocketService,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const peer = makePeer("1.1.1.1");
		repository.getKnownPeers = () => [peer];
		// What the processor does when the verification succeeds.
		websocketService.dial = async () => {
			peer.dialAttempts = 0;
		};
		const forgetKnownPeer = spy(repository, "forgetKnownPeer");

		void service.mainLoop();
		await fakeTimers.tickAsync(2 * constants.MAX_DIAL_ATTEMPTS * constants.DIAL_SPACING);

		forgetKnownPeer.neverCalled();

		await service.dispose();
	});
});

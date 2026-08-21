import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import dayjs from "dayjs";

import { constants } from "./constants";
import { Service } from "./service";

const makePeer = (ip: string, extra: Record<string, unknown> = {}): any => ({
	header: {},
	ip,
	port: 4002,
	version: "0.0.1",
	...extra,
});

describe<{
	service: Service;
	repository: any;
	peerVerifier: any;
	state: any;
	logger: any;
	peerDiscoverer: any;
	apiNodeDiscoverer: any;
	configuration: any;
}>("Service", ({ it, beforeEach, assert, clock, spy, stub }) => {
	beforeEach((context) => {
		context.logger = { debug: () => {}, error: () => {}, info: () => {}, warn: () => {} };
		context.repository = { getPeers: () => [], hasMinimumPeers: () => true };
		context.peerVerifier = { verify: async () => true };
		context.state = { getLastMessageTime: () => dayjs() };
		context.peerDiscoverer = { discoverPeers: async () => {}, populateSeedPeers: async () => {} };
		context.apiNodeDiscoverer = {
			discoverNewApiNodes: async () => {},
			populateApiNodesFromConfiguration: async () => {},
			refreshApiNodes: async () => {},
		};
		context.configuration = { getRequired: (key: string) => ({ verifyTimeout: 60_000 })[key] };

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
			.whenTagged("plugin", "p2p");
		app.bind(Identifiers.P2P.State).toConstantValue(context.state);
		app.bind(Identifiers.P2P.Peer.Discoverer).toConstantValue(context.peerDiscoverer);
		app.bind(Identifiers.P2P.ApiNode.Discoverer).toConstantValue(context.apiNodeDiscoverer);
		app.bind(Identifiers.P2P.Peer.Verifier).toConstantValue(context.peerVerifier);
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.service = app.resolve(Service);
	});

	it("#cleansePeers - should do nothing when there are no peers", async ({ service, peerVerifier, logger }) => {
		const verify = spy(peerVerifier, "verify");
		const info = spy(logger, "info");

		await service.cleansePeers({ fast: true, peerCount: 5 });

		verify.neverCalled();
		info.neverCalled();
	});

	it("#cleansePeers - should verify every peer when the repository holds fewer than peerCount", async ({
		service,
		repository,
		peerVerifier,
		logger,
	}) => {
		repository.getPeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2"), makePeer("3.3.3.3")];
		const verify = spy(peerVerifier, "verify");
		const info = spy(logger, "info");

		await service.cleansePeers({ fast: true, peerCount: 5 });

		verify.calledTimes(3);
		info.calledWith("Checking 3 peers", "p2p");
	});

	it("#cleansePeers - should verify at most peerCount peers", async ({ service, repository, peerVerifier }) => {
		repository.getPeers = () => [
			makePeer("1.1.1.1"),
			makePeer("2.2.2.2"),
			makePeer("3.3.3.3"),
			makePeer("4.4.4.4"),
			makePeer("5.5.5.5"),
		];
		const verify = spy(peerVerifier, "verify");

		await service.cleansePeers({ fast: true, peerCount: 2 });

		verify.calledTimes(2);
	});

	it("#cleansePeers - should log the number of unresponsive peers", async ({
		service,
		repository,
		peerVerifier,
		logger,
	}) => {
		repository.getPeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2"), makePeer("3.3.3.3")];
		peerVerifier.verify = async (peer) => peer.ip === "2.2.2.2";
		const debug = spy(logger, "debug");

		await service.cleansePeers({ fast: true, peerCount: 5 });

		debug.calledWith("Removed 2 peers", "p2p");
	});

	it("#cleansePeers - should not log removals when every peer is responsive", async ({
		service,
		repository,
		logger,
	}) => {
		repository.getPeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2")];
		const debug = spy(logger, "debug");

		await service.cleansePeers({ fast: true, peerCount: 5 });

		debug.neverCalled();
	});

	it("#cleansePeers - should resolve once all verifications finish and clear the cutoff timer", async ({
		service,
		repository,
	}) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		repository.getPeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2")];

		let resolved = false;
		const promise = service.cleansePeers({ fast: true, peerCount: 5 }).then(() => (resolved = true));

		await fakeTimers.tickAsync(0);
		assert.true(resolved);
		assert.equal(fakeTimers.countTimers(), 0);

		await promise;
	});

	it("#cleansePeers - fast mode should cut loose after the fast timeout when a verification hangs", async ({
		service,
		repository,
		peerVerifier,
	}) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		repository.getPeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2")];
		peerVerifier.verify = (peer) => (peer.ip === "1.1.1.1" ? Promise.resolve(true) : new Promise(() => {}));

		let resolved = false;
		const promise = service.cleansePeers({ fast: true, peerCount: 5 }).then(() => (resolved = true));

		await fakeTimers.tickAsync(constants.FAST_VERIFY_TIMEOUT - 1);
		assert.false(resolved);

		await fakeTimers.tickAsync(1);
		assert.true(resolved);
		assert.equal(fakeTimers.countTimers(), 0);

		await promise;
	});

	it("#cleansePeers - should cut loose after the configured verifyTimeout when not in fast mode", async ({
		service,
		repository,
		peerVerifier,
		configuration,
	}) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		repository.getPeers = () => [makePeer("1.1.1.1")];
		peerVerifier.verify = () => new Promise(() => {});
		const getRequired = spy(configuration, "getRequired");

		let resolved = false;
		const promise = service.cleansePeers({ fast: false, peerCount: 5 }).then(() => (resolved = true));

		getRequired.calledWith("verifyTimeout");

		await fakeTimers.tickAsync(59_999);
		assert.false(resolved);

		await fakeTimers.tickAsync(1);
		assert.true(resolved);

		await promise;
	});

	it("#cleansePeers - should let slow verifications finish in the background after the cutoff", async ({
		service,
		repository,
		peerVerifier,
		logger,
	}) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		repository.getPeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2")];
		peerVerifier.verify = (peer) =>
			peer.ip === "1.1.1.1"
				? Promise.resolve(true)
				: new Promise((resolve) => setTimeout(() => resolve(false), 5000));
		const debug = spy(logger, "debug");

		let resolved = false;
		const promise = service.cleansePeers({ fast: true, peerCount: 5 }).then(() => (resolved = true));

		await fakeTimers.tickAsync(constants.FAST_VERIFY_TIMEOUT);
		assert.true(resolved);

		// The slow peer had not failed by the cutoff, so nothing was logged as removed.
		debug.neverCalled();

		// The slow verification settles in the background without surfacing errors
		// and without being logged retroactively.
		await fakeTimers.tickAsync(5000);
		debug.neverCalled();
		assert.equal(fakeTimers.countTimers(), 0);

		await promise;
	});

	it("#cleansePeers - should log a verification that rejects in the background after the cutoff", async ({
		service,
		repository,
		peerVerifier,
		logger,
	}) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		repository.getPeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2")];
		peerVerifier.verify = (peer) =>
			peer.ip === "1.1.1.1"
				? Promise.resolve(true)
				: new Promise((_, reject) => setTimeout(() => reject(new Error("late boom")), 5000));
		const error = spy(logger, "error");

		let resolved = false;
		const promise = service.cleansePeers({ fast: true, peerCount: 5 }).then(() => (resolved = true));

		await fakeTimers.tickAsync(constants.FAST_VERIFY_TIMEOUT);
		assert.true(resolved);
		error.neverCalled();

		// The late rejection is caught and logged instead of surfacing as unhandled.
		await fakeTimers.tickAsync(5000);
		error.calledWith("Peer verification failed: late boom", "p2p");
		assert.equal(fakeTimers.countTimers(), 0);

		await promise;
	});

	it("#cleansePeers - should skip peers whose verification is still in flight and retry them once it settles", async ({
		service,
		repository,
		peerVerifier,
	}) => {
		const fakeTimers = clock({ toFake: ["setTimeout", "clearTimeout"] });
		repository.getPeers = () => [makePeer("1.1.1.1")];

		let verifyCalls = 0;
		let release!: (result: boolean) => void;
		peerVerifier.verify = () => {
			verifyCalls++;
			return new Promise<boolean>((resolve) => (release = resolve));
		};

		// The first cleanse hangs on the verification and is cut loose.
		let firstResolved = false;
		const first = service.cleansePeers({ fast: true, peerCount: 5 }).then(() => (firstResolved = true));
		await fakeTimers.tickAsync(constants.FAST_VERIFY_TIMEOUT);
		assert.true(firstResolved);
		assert.equal(verifyCalls, 1);

		// A second cleanse finds no eligible peer and returns immediately.
		let secondResolved = false;
		void service.cleansePeers({ fast: true, peerCount: 5 }).then(() => (secondResolved = true));
		await fakeTimers.tickAsync(0);
		assert.true(secondResolved);
		assert.equal(verifyCalls, 1);

		// Once the hung verification settles, the peer becomes eligible again.
		release(true);
		await fakeTimers.tickAsync(0);
		await first;

		let thirdResolved = false;
		void service.cleansePeers({ fast: true, peerCount: 5 }).then(() => (thirdResolved = true));
		assert.equal(verifyCalls, 2);
		release(true);
		await fakeTimers.tickAsync(0);
		assert.true(thirdResolved);
	});

	it("#cleansePeers - should resolve and log instead of hanging when a verification rejects", async ({
		service,
		repository,
		peerVerifier,
		logger,
	}) => {
		repository.getPeers = () => [makePeer("1.1.1.1")];
		peerVerifier.verify = async () => {
			throw new Error("boom");
		};
		const error = spy(logger, "error");

		await service.cleansePeers({ fast: true, peerCount: 5 });

		error.calledWith("Peer verification failed: boom", "p2p");
	});

	it("#mainLoop - should re-arm every 2 seconds until disposed", async ({ service, state }) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const getLastMessageTime = spy(state, "getLastMessageTime");

		void service.mainLoop();
		await fakeTimers.tickAsync(0);
		getLastMessageTime.calledTimes(1);

		await fakeTimers.tickAsync(2000);
		getLastMessageTime.calledTimes(2);

		await fakeTimers.tickAsync(2000);
		getLastMessageTime.calledTimes(3);

		assert.equal(fakeTimers.countTimers(), 1);
		await service.dispose();
		assert.equal(fakeTimers.countTimers(), 0);

		await fakeTimers.tickAsync(10_000);
		getLastMessageTime.calledTimes(3);
	});

	it("#mainLoop - should not re-arm when disposed during an in-flight iteration", async ({
		service,
		state,
		repository,
		peerVerifier,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		state.getLastMessageTime = () => dayjs().subtract(9, "second");
		repository.getPeers = () => [makePeer("1.1.1.1")];

		let release!: (result: boolean) => void;
		peerVerifier.verify = () => new Promise<boolean>((resolve) => (release = resolve));

		// The iteration is now in flight, blocked on the verification.
		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		await service.dispose();

		release(true);
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
		repository.getPeers = () => [makePeer("1.1.1.1"), makePeer("2.2.2.2")];
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

	it("#mainLoop - should fast-cleanse at least 5 peers when no messages arrived within 8 seconds", async ({
		service,
		state,
		repository,
		peerVerifier,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		state.getLastMessageTime = () => dayjs().subtract(9, "second");
		repository.getPeers = () => Array.from({ length: 10 }, (_, index) => makePeer(`1.1.1.${index}`));
		const verify = stub(peerVerifier, "verify").resolvedValue(true);

		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		// max(ceil(10 * 0.2), 5) = 5
		verify.calledTimes(5);

		await service.dispose();
	});

	it("#mainLoop - should fast-cleanse 20% of peers (rounded up) when that exceeds the minimum of 5", async ({
		service,
		state,
		repository,
		peerVerifier,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		state.getLastMessageTime = () => dayjs().subtract(9, "second");
		repository.getPeers = () => Array.from({ length: 26 }, (_, index) => makePeer(`1.1.1.${index}`));
		const verify = stub(peerVerifier, "verify").resolvedValue(true);

		void service.mainLoop();
		await fakeTimers.tickAsync(0);

		// ceil(26 * 0.2) = 6
		verify.calledTimes(6);

		await service.dispose();
	});

	it("#mainLoop - should log and re-arm when a check throws", async ({ service, state, logger }) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const error = spy(logger, "error");

		let calls = 0;
		state.getLastMessageTime = () => {
			calls++;
			if (calls === 1) {
				throw new Error("boom");
			}

			return dayjs();
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

	it("#boot - should skip booting in the test environment", async ({ service, apiNodeDiscoverer }) => {
		const previous = process.env.MAINSAIL_ENV;
		process.env.MAINSAIL_ENV = "test";

		try {
			const populate = spy(apiNodeDiscoverer, "populateApiNodesFromConfiguration");

			await service.boot();

			populate.neverCalled();
		} finally {
			if (previous === undefined) {
				delete process.env.MAINSAIL_ENV;
			} else {
				process.env.MAINSAIL_ENV = previous;
			}
		}
	});

	it("#boot - should populate api nodes and seed peers, log discovered versions and start the loops", async ({
		service,
		apiNodeDiscoverer,
		peerDiscoverer,
		repository,
		logger,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const previous = process.env.MAINSAIL_ENV;
		delete process.env.MAINSAIL_ENV;

		try {
			repository.getPeers = () => [
				makePeer("1.1.1.1"),
				makePeer("2.2.2.2"),
				makePeer("3.3.3.3", { version: "0.0.2" }),
			];
			const populateApiNodes = spy(apiNodeDiscoverer, "populateApiNodesFromConfiguration");
			const discoverNewApiNodes = spy(apiNodeDiscoverer, "discoverNewApiNodes");
			const populateSeedPeers = spy(peerDiscoverer, "populateSeedPeers");
			const info = spy(logger, "info");

			await service.boot();
			await fakeTimers.tickAsync(0);

			populateApiNodes.calledOnce();
			populateSeedPeers.calledOnce();
			discoverNewApiNodes.calledOnce();
			info.calledWith("Discovered 2 peers with v0.0.1.", "p2p");
			info.calledWith("Discovered 1 peer with v0.0.2.", "p2p");

			// Both loop timers are pending; dispose cancels them all.
			assert.equal(fakeTimers.countTimers(), 2);
			await service.dispose();
			assert.equal(fakeTimers.countTimers(), 0);
		} finally {
			await service.dispose();

			if (previous === undefined) {
				delete process.env.MAINSAIL_ENV;
			} else {
				process.env.MAINSAIL_ENV = previous;
			}
		}
	});

	it("#boot - should log and re-arm the api node check when it throws", async ({
		service,
		apiNodeDiscoverer,
		logger,
	}) => {
		const fakeTimers = clock({ now: Date.now(), toFake: ["Date", "setTimeout", "clearTimeout"] });
		const previous = process.env.MAINSAIL_ENV;
		delete process.env.MAINSAIL_ENV;

		try {
			let calls = 0;
			apiNodeDiscoverer.discoverNewApiNodes = async () => {
				calls++;
				if (calls === 1) {
					throw new Error("boom");
				}
			};
			const error = spy(logger, "error");

			await service.boot();
			await fakeTimers.tickAsync(0);

			error.calledWith("API node check failed: boom", "p2p");
			assert.equal(calls, 1);

			// The check re-armed despite the failure (10-20 min random delay).
			await fakeTimers.tickAsync(20 * 60 * 1000);
			assert.equal(calls, 2);
		} finally {
			await service.dispose();

			if (previous === undefined) {
				delete process.env.MAINSAIL_ENV;
			} else {
				process.env.MAINSAIL_ENV = previous;
			}
		}
	});

	it("#getNetworkBlockNumberPercentile - should compute the percentile over peers reporting a block number", ({
		service,
		repository,
	}) => {
		repository.getPeers = () => [
			makePeer("1.1.1.1", { header: { blockNumber: 9 } }),
			makePeer("2.2.2.2", { header: { blockNumber: 3 } }),
			makePeer("3.3.3.3", { header: { blockNumber: 5 } }),
			makePeer("4.4.4.4", { header: {} }),
		];

		assert.equal(service.getNetworkBlockNumberPercentile(50), 5);
	});
});

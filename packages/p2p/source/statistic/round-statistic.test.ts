import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { RoundStatistic } from "./round-statistic";

const MAX_TRACKED_PEERS = 250;
const MAX_ENDPOINT_SAMPLES = 32;

describe<{
	app: Application;
	statistic: RoundStatistic;
}>("RoundStatistic", ({ it, assert, beforeEach }) => {
	const ping = (responseTime: number, success = true) => ({ responseTime, success });
	const emit = (responseTime: number, success = true) => ({
		deserializeTime: 0,
		responseTime,
		success,
		throttleTime: 0,
	});

	beforeEach((context) => {
		context.app = new Application();
		context.statistic = context.app.resolve(RoundStatistic);
	});

	it("should report the fastest and slowest response times and the average", ({ statistic }) => {
		for (const responseTime of [50, 10, 30, 20, 40]) {
			statistic.addPing("1.2.3.4", "getStatus", ping(responseTime));
		}

		const [endpoint] = statistic.getPingStatistics();

		assert.equal(endpoint.count, { emits: 5, peers: 1, success: 5 });
		assert.equal(endpoint.response.min, [10, 20, 30]);
		assert.equal(endpoint.response.max, [50, 40, 30]);
		assert.equal(endpoint.response.average, 30);
	});

	it("should count successes and failures per endpoint and peer", ({ statistic }) => {
		statistic.addPing("1.2.3.4", "getStatus", ping(10));
		statistic.addPing("1.2.3.4", "getStatus", ping(20, false));
		statistic.addPing("5.6.7.8", "getStatus", ping(30));

		const [endpoint] = statistic.getPingStatistics();
		assert.equal(endpoint.count, { emits: 3, peers: 2, success: 2 });

		const general = statistic.getGeneralStatistic();
		assert.equal(general.count.pingsSuccess, 2);
		assert.equal(general.count.pingsFailed, 1);
	});

	it("should keep the general counts exact past the peer cap", ({ statistic }) => {
		const total = MAX_TRACKED_PEERS + 500;
		for (let index = 0; index < total; index++) {
			statistic.addPing(`10.0.${Math.floor(index / 256)}.${index % 256}`, "getStatus", ping(10, index % 2 === 0));
		}

		const general = statistic.getGeneralStatistic();

		assert.equal(general.count.pingsSuccess + general.count.pingsFailed, total);
		assert.equal(general.count.pingsSuccess, Math.ceil(total / 2));
		// The endpoint breakdown is a single key, so it also stays exact.
		assert.equal(statistic.getPingStatistics()[0].count.emits, total);
	});

	it("should cap the number of tracked peers and report what it could not attribute", ({ statistic }) => {
		const total = MAX_TRACKED_PEERS + 500;
		for (let index = 0; index < total; index++) {
			statistic.addPing(`10.0.${Math.floor(index / 256)}.${index % 256}`, "getStatus", ping(10));
		}

		assert.equal(statistic.getPeerStatistics().length, MAX_TRACKED_PEERS);
		assert.equal(statistic.getGeneralStatistic().count.recordsDropped, 500);
	});

	it("should not report dropped records while under the caps", ({ statistic }) => {
		statistic.addPing("1.2.3.4", "getStatus", ping(10));
		statistic.addEmit("1.2.3.4", "getBlocks", emit(10));

		assert.equal(statistic.getGeneralStatistic().count.recordsDropped, 0);
	});

	it("should retain a bounded number of samples per peer endpoint", ({ statistic }) => {
		for (let index = 0; index < 10_000; index++) {
			statistic.addPing("1.2.3.4", "getStatus", ping(index));
		}

		const [peer] = statistic.getPeerStatistics();

		assert.equal(peer.pings.count, 10_000);
		assert.equal(peer.pings.endpoints.length, 1);
		assert.equal(peer.pings.endpoints[0].responseTimes.length, MAX_ENDPOINT_SAMPLES);
		// The retained samples are the most recent ones, returned ascending.
		assert.equal(peer.pings.endpoints[0].responseTimes[MAX_ENDPOINT_SAMPLES - 1], 9999);
		// Extremes still come from the running totals, not from the samples.
		assert.equal(peer.pings.min, [0, 1, 2]);
		assert.equal(peer.pings.max, [9999, 9998, 9997]);
	});

	it("should order peer endpoints by their full request count", ({ statistic }) => {
		for (let index = 0; index < 100; index++) {
			statistic.addPing("1.2.3.4", "getStatus", ping(1));
		}
		for (let index = 0; index < 50; index++) {
			statistic.addPing("1.2.3.4", "getBlocks", ping(1));
		}

		const [peer] = statistic.getPeerStatistics();

		assert.equal(
			peer.pings.endpoints.map((endpoint) => endpoint.name),
			["getStatus", "getBlocks"],
		);
	});

	it("should keep emits and pings separate", ({ statistic }) => {
		statistic.addEmit("1.2.3.4", "getBlocks", emit(10));
		statistic.addPing("1.2.3.4", "getStatus", ping(20));

		assert.equal(
			statistic.getEmitStatistics().map((endpoint) => endpoint.endpoint),
			["getBlocks"],
		);
		assert.equal(
			statistic.getPingStatistics().map((endpoint) => endpoint.endpoint),
			["getStatus"],
		);

		const [peer] = statistic.getPeerStatistics();
		assert.equal(peer.emits.count, 1);
		assert.equal(peer.pings.count, 1);
	});

	it("should cap the peers reported as added, removed and banned", ({ statistic }) => {
		for (let index = 0; index < MAX_TRACKED_PEERS + 100; index++) {
			const ip = `10.0.${Math.floor(index / 256)}.${index % 256}`;
			statistic.peerAdded(ip);
			statistic.peerRemoved(ip);
			statistic.peerBanned(`11.0.${Math.floor(index / 256)}.${index % 256}`);
		}

		const { peers } = statistic.getGeneralStatistic();

		assert.equal(peers.added.length, MAX_TRACKED_PEERS);
		assert.equal(peers.removed.length, MAX_TRACKED_PEERS);
		assert.equal(peers.banned.length, MAX_TRACKED_PEERS);
	});

	it("should report the peers left out once the lists are full", ({ statistic }) => {
		for (let index = 0; index < MAX_TRACKED_PEERS + 100; index++) {
			statistic.peerAdded(`10.0.${Math.floor(index / 256)}.${index % 256}`);
		}

		const { count, peers } = statistic.getGeneralStatistic();

		assert.equal(peers.added.length, MAX_TRACKED_PEERS);
		assert.equal(count.peersDropped, 100);
	});

	it("should not report dropped peers while under the cap", ({ statistic }) => {
		statistic.peerAdded("1.2.3.4");
		statistic.peerBanned("5.6.7.8");

		assert.equal(statistic.getGeneralStatistic().count.peersDropped, 0);
	});

	it("should not report a banned peer as removed", ({ statistic }) => {
		statistic.peerRemoved("1.2.3.4");
		statistic.peerBanned("1.2.3.4");

		const { peers } = statistic.getGeneralStatistic();

		assert.equal(peers.removed, []);
		assert.equal(peers.banned, ["1.2.3.4"]);
	});

	it("should not report a banned peer as removed once the banned set is saturated", ({ statistic }) => {
		for (let index = 0; index < MAX_TRACKED_PEERS; index++) {
			statistic.peerBanned(`10.0.${Math.floor(index / 256)}.${index % 256}`);
		}

		statistic.peerBanned("1.2.3.4");
		statistic.peerRemoved("1.2.3.4");

		const { peers } = statistic.getGeneralStatistic();

		assert.equal(peers.removed, []);
	});
});

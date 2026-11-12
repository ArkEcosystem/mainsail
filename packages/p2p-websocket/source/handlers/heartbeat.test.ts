import { describe } from "@mainsail/test-runner";

import { constants } from "../constants.js";
import { CloseReason, Direction } from "../enums.js";
import { Heartbeat } from "./heartbeat.js";

type Probe = { heartbeat: Heartbeat; pings: number; failures: string[] };

const make = (direction: Direction): Probe => {
	const probe: Probe = { failures: [], heartbeat: undefined as unknown as Heartbeat, pings: 0 };
	probe.heartbeat = new Heartbeat({
		direction,
		fail: (error) => probe.failures.push(`${error.reason}: ${error.message}`),
		ping: () => probe.pings++,
	});

	return probe;
};

describe<{
	dialer: Probe;
	acceptor: Probe;
	fakeTimers: any;
}>("Heartbeat", ({ it, assert, beforeEach, afterEach, clock }) => {
	beforeEach((context) => {
		context.fakeTimers = clock({
			now: 1_000_000,
			toFake: ["Date", "setInterval", "clearInterval", "setTimeout", "clearTimeout"],
		});
		context.dialer = make(Direction.Outbound);
		context.acceptor = make(Direction.Inbound);
	});

	afterEach(({ dialer, acceptor }) => {
		dialer.heartbeat.stop();
		acceptor.heartbeat.stop();
	});

	it("dialer - should ping every interval while the pongs keep coming", ({ dialer, fakeTimers }) => {
		dialer.heartbeat.start();

		for (let round = 1; round <= 3; round++) {
			fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
			assert.equal(dialer.pings, round);
			dialer.heartbeat.onPong();
		}

		assert.equal(dialer.failures, []);
	});

	it("dialer - should fail when a ping is still unanswered at the next one", ({ dialer, fakeTimers }) => {
		dialer.heartbeat.start();

		fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
		assert.equal(dialer.failures, []);

		fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
		assert.equal(dialer.failures, [`${CloseReason.HeartbeatTimeout}: Peer did not answer the heartbeat`]);

		// It stopped itself.
		fakeTimers.tick(constants.HEARTBEAT_INTERVAL * 3);
		assert.equal(dialer.pings, 1);
		assert.equal(dialer.failures.length, 1);
	});

	it("dialer - should fail on a pong nobody asked for and ignore everything after", ({ dialer, fakeTimers }) => {
		dialer.heartbeat.start();

		dialer.heartbeat.onPong();
		assert.equal(dialer.failures, [`${CloseReason.ProtocolError}: Unexpected pong`]);

		dialer.heartbeat.onPong();
		dialer.heartbeat.onPing();
		fakeTimers.tick(constants.HEARTBEAT_INTERVAL * 2);
		assert.equal(dialer.failures.length, 1);
		assert.equal(dialer.pings, 0);
	});

	it("dialer - should fail on a second pong to one ping and on a ping", ({ fakeTimers }) => {
		const doublePong = make(Direction.Outbound);
		doublePong.heartbeat.start();
		fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
		doublePong.heartbeat.onPong();
		doublePong.heartbeat.onPong();
		assert.equal(doublePong.failures, [`${CloseReason.ProtocolError}: Unexpected pong`]);

		const pinged = make(Direction.Outbound);
		pinged.heartbeat.start();
		pinged.heartbeat.onPing();
		assert.equal(pinged.failures, [`${CloseReason.ProtocolError}: Unexpected ping`]);
	});

	it("acceptor - should never ping and should accept pings that keep coming in time", ({ acceptor, fakeTimers }) => {
		acceptor.heartbeat.start();

		for (let round = 0; round < 3; round++) {
			fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
			acceptor.heartbeat.onPing();
		}

		assert.equal(acceptor.pings, 0);
		assert.equal(acceptor.failures, []);
	});

	it("acceptor - should fail when no ping arrives within the timeout", ({ acceptor, fakeTimers }) => {
		acceptor.heartbeat.start();

		fakeTimers.tick(constants.HEARTBEAT_TIMEOUT - 1);
		assert.equal(acceptor.failures, []);

		fakeTimers.tick(1);
		assert.equal(acceptor.failures, [`${CloseReason.HeartbeatTimeout}: Peer stopped sending heartbeats`]);
	});

	it("acceptor - should fail when the pings come too close together", ({ acceptor, fakeTimers }) => {
		acceptor.heartbeat.start();

		fakeTimers.tick(constants.HEARTBEAT_INTERVAL);
		acceptor.heartbeat.onPing();
		fakeTimers.tick(constants.HEARTBEAT_MIN_SPACING - 1);
		acceptor.heartbeat.onPing();

		assert.equal(acceptor.failures, [`${CloseReason.ProtocolError}: Pings too close together`]);
	});

	it("acceptor - should fail on a pong", ({ acceptor }) => {
		acceptor.heartbeat.start();

		acceptor.heartbeat.onPong();

		assert.equal(acceptor.failures, [`${CloseReason.ProtocolError}: Unexpected pong`]);
	});
});

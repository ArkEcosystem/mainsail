import { describe } from "@mainsail/test-runner";

import type { Message } from "../interfaces/index.js";

import { constants } from "../constants.js";
import { CloseReason, Direction } from "../enums.js";
import { Handshake } from "./handshake.js";

type Probe = {
	handshake: Handshake;
	sent: Message[];
	rejected: CloseReason[];
	failed: string[];
	opened: number;
	hellos: Message[];
};

const make = (direction: Direction): Probe => {
	const probe: Probe = {
		failed: [],
		handshake: undefined as unknown as Handshake,
		hellos: [],
		opened: 0,
		rejected: [],
		sent: [],
	};
	probe.handshake = new Handshake({
		direction,
		fail: (error) => probe.failed.push(error.message),
		open: (hello) => {
			probe.opened++;
			probe.hellos.push(hello);
		},
		reject: (reason) => probe.rejected.push(reason),
		isValidVersion: (version) => version !== "0.9.0",
		send: (message) => probe.sent.push(message),
		version: "1.2.3",
	});

	return probe;
};

const hello = { protocolVersion: constants.PROTOCOL_VERSION, type: "hello" as const, version: "1.2.3" };

describe("Handshake", ({ it, assert, clock }) => {
	it("dialer - should send hello and open with the hello the acceptor answers", async () => {
		const probe = make(Direction.Outbound);

		const started = probe.handshake.start();
		assert.equal(probe.sent, [hello]);

		const answer = { ...hello, version: "4.5.6" };
		probe.handshake.onHello(answer);
		await started;

		assert.equal(probe.opened, 1);
		assert.equal(probe.hellos, [answer]);
		assert.equal(probe.sent.length, 1);
	});

	it("acceptor - should wait for hello, answer with its own and open, also when it arrived before start", async () => {
		const probe = make(Direction.Inbound);

		const theirs = { ...hello, version: "4.5.6" };
		probe.handshake.onHello(theirs);
		assert.equal(probe.sent, [hello]);
		assert.equal(probe.opened, 1);
		assert.equal(probe.hellos, [theirs]);

		await probe.handshake.start();
	});

	it("acceptor - should reject a different protocol version", async () => {
		const probe = make(Direction.Inbound);
		const started = probe.handshake.start().catch((error) => error);

		probe.handshake.onHello({ ...hello, protocolVersion: constants.PROTOCOL_VERSION + 1 });

		assert.equal(probe.rejected, [CloseReason.VersionMismatch]);
		assert.equal((await started).reason, CloseReason.VersionMismatch);
		assert.equal(probe.opened, 0);
	});

	it("acceptor - should reject a version of the software we do not connect with", async () => {
		const probe = make(Direction.Inbound);
		const started = probe.handshake.start().catch((error) => error);

		probe.handshake.onHello({ ...hello, version: "0.9.0" });

		assert.equal(probe.rejected, [CloseReason.VersionMismatch]);
		assert.equal(probe.sent, []);
		assert.equal(probe.opened, 0);

		const error = await started;
		assert.equal(error.reason, CloseReason.VersionMismatch);
		assert.equal(error.message, 'Software version "0.9.0" is not accepted');
	});

	it("dialer - should hang up on an acceptor whose software we do not connect with", async () => {
		const probe = make(Direction.Outbound);
		const started = probe.handshake.start().catch((error) => error);

		probe.handshake.onHello({ ...hello, version: "0.9.0" });

		// Only the acceptor tells the other side why.
		assert.equal(probe.rejected, []);
		assert.equal(probe.opened, 0);
		assert.equal((await started).reason, CloseReason.VersionMismatch);
	});

	it("dialer - should fail with the peer's reason when rejected", async () => {
		const probe = make(Direction.Outbound);
		const started = probe.handshake.start().catch((error) => error);

		probe.handshake.onReject({ reason: CloseReason.Banned, type: "reject" });

		assert.equal((await started).reason, CloseReason.Banned);
	});

	it("should time out", async () => {
		const fakeTimers = clock();
		const probe = make(Direction.Outbound);
		const started = probe.handshake.start().catch((error) => error);

		fakeTimers.tick(constants.HANDSHAKE_TIMEOUT);

		assert.equal((await started).reason, CloseReason.HandshakeTimeout);
	});

	it("should treat a hello or a reject after the handshake as a violation that ends the connection", async () => {
		const probe = make(Direction.Outbound);
		const started = probe.handshake.start();
		probe.handshake.onHello(hello);
		await started;

		probe.handshake.onHello(hello);
		probe.handshake.onReject({ reason: CloseReason.Banned, type: "reject" });

		assert.equal(probe.failed, ["Unexpected hello", "Unexpected reject"]);
	});
});

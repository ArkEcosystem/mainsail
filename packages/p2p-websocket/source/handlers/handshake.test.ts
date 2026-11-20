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
};

const make = (direction: Direction): Probe => {
	const probe: Probe = {
		failed: [],
		handshake: undefined as unknown as Handshake,
		opened: 0,
		rejected: [],
		sent: [],
	};
	probe.handshake = new Handshake({
		direction,
		fail: (error) => probe.failed.push(error.message),
		open: () => probe.opened++,
		reject: (reason) => probe.rejected.push(reason),
		send: (message) => probe.sent.push(message),
	});

	return probe;
};

const hello = { type: "hello" as const, version: constants.PROTOCOL_VERSION };

describe("Handshake", ({ it, assert, clock }) => {
	it("dialer - should send hello and open on the echo", async () => {
		const probe = make(Direction.Outbound);

		const started = probe.handshake.start();
		assert.equal(probe.sent, [hello]);

		probe.handshake.onHello(hello);
		await started;

		assert.equal(probe.opened, 1);
		assert.equal(probe.sent.length, 1);
	});

	it("acceptor - should wait for hello, echo it and open, also when it arrived before start", async () => {
		const probe = make(Direction.Inbound);

		probe.handshake.onHello(hello);
		assert.equal(probe.sent, [hello]);
		assert.equal(probe.opened, 1);

		await probe.handshake.start();
	});

	it("acceptor - should reject a different protocol version", async () => {
		const probe = make(Direction.Inbound);
		const started = probe.handshake.start().catch((error) => error);

		probe.handshake.onHello({ type: "hello", version: constants.PROTOCOL_VERSION + 1 });

		assert.equal(probe.rejected, [CloseReason.VersionMismatch]);
		assert.equal((await started).reason, CloseReason.VersionMismatch);
		assert.equal(probe.opened, 0);
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

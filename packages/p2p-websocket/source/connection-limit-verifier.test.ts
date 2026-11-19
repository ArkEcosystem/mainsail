import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ConnectionLimitVerifier } from "./connection-limit-verifier.js";
import { CloseReason, Direction } from "./enums.js";

describe<{
	verifier: ConnectionLimitVerifier;
	connections: { direction: Direction }[];
}>("ConnectionLimitVerifier", ({ it, assert, beforeEach }) => {
	const inbound = { direction: Direction.Inbound };
	const outbound = { direction: Direction.Outbound };

	beforeEach((context) => {
		context.connections = [];

		const limits = { "server.maxInboundConnections": 2, "server.maxOutboundConnections": 1 };
		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: (key: string) => limits[key] })
			.whenTagged("plugin", "p2p-websocket");
		app.bind(Identifiers.P2P.WebSocket.Connection.Repository).toConstantValue({ all: () => context.connections });

		context.verifier = app.resolve(ConnectionLimitVerifier);
	});

	it("should accept an inbound socket below the inbound limit", ({ verifier, connections }) => {
		connections.push(inbound);

		assert.undefined(verifier.verify("178.165.55.55", Direction.Inbound));
	});

	it("should refuse an inbound socket as full once the inbound limit is reached", ({ verifier, connections }) => {
		connections.push(inbound, inbound);

		assert.equal(verifier.verify("178.165.55.55", Direction.Inbound), CloseReason.Full);
	});

	it("should allow a dial below the outbound limit", ({ verifier }) => {
		assert.undefined(verifier.verify("178.165.55.55", Direction.Outbound));
	});

	it("should refuse a dial as full once the outbound limit is reached", ({ verifier, connections }) => {
		connections.push(outbound);

		assert.equal(verifier.verify("178.165.55.55", Direction.Outbound), CloseReason.Full);
	});

	it("should count each direction on its own", ({ verifier, connections }) => {
		// The inbound side is full; the outbound side still has room, and the other way round.
		connections.push(inbound, inbound);
		assert.undefined(verifier.verify("178.165.55.55", Direction.Outbound));

		connections.length = 0;
		connections.push(outbound);
		assert.undefined(verifier.verify("178.165.55.55", Direction.Inbound));
	});
});

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { CloseReason, Direction } from "./enums.js";
import { InboundLimitVerifier } from "./inbound-limit-verifier.js";

describe<{
	verifier: InboundLimitVerifier;
	connections: { direction: Direction }[];
}>("InboundLimitVerifier", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.connections = [];

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: (key: string) => ({ "server.maxInboundConnections": 2 })[key] })
			.whenTagged("plugin", "p2p-websocket");
		app.bind(Identifiers.P2P.WebSocket.Connection.Repository).toConstantValue({ all: () => context.connections });

		context.verifier = app.resolve(InboundLimitVerifier);
	});

	it("should accept an inbound socket below the limit", ({ verifier, connections }) => {
		connections.push({ direction: Direction.Inbound });

		assert.undefined(verifier.verify("178.165.55.55", Direction.Inbound));
	});

	it("should refuse an inbound socket as full once the limit is reached", ({ verifier, connections }) => {
		connections.push({ direction: Direction.Inbound }, { direction: Direction.Inbound });

		assert.equal(verifier.verify("178.165.55.55", Direction.Inbound), CloseReason.Full);
	});

	it("should not count the connections we dialed", ({ verifier, connections }) => {
		connections.push(
			{ direction: Direction.Outbound },
			{ direction: Direction.Outbound },
			{ direction: Direction.Inbound },
		);

		assert.undefined(verifier.verify("178.165.55.55", Direction.Inbound));
	});

	it("should never refuse a dial", ({ verifier, connections }) => {
		connections.push({ direction: Direction.Inbound }, { direction: Direction.Inbound });

		assert.undefined(verifier.verify("178.165.55.55", Direction.Outbound));
	});
});

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Dialer } from "./dialer.js";
import { CloseReason } from "./enums.js";

describe<{
	dialer: Dialer;
	verified: string[];
}>("Dialer", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.verified = [];

		const app = new Application();
		app.bind(Identifiers.P2P.WebSocket.Connection.Factory).toConstantValue(() => {
			throw new Error("not reached");
		});
		app.bind(Identifiers.P2P.WebSocket.Connection.Repository).toConstantValue({ get: () => undefined });
		// Records the address the verifiers get and refuses it, so no socket is ever opened.
		app.bind(Identifiers.P2P.WebSocket.Connection.Verifiers).toConstantValue({
			verify: (ip: string) => {
				context.verified.push(ip);
				return CloseReason.Rejected;
			},
		});
		app.bind(Identifiers.P2P.WebSocket.Router).toConstantValue({});

		context.dialer = app.resolve(Dialer);
	});

	it("should hand the verifiers the bare address of an IPv4 url", async ({ dialer, verified }) => {
		await assert.rejects(() => dialer.dial("ws://178.165.55.55:4002"), "Refused to dial 178.165.55.55: rejected");

		assert.equal(verified, ["178.165.55.55"]);
	});

	it("should hand the verifiers the bare address of an IPv6 url, without the brackets", async ({
		dialer,
		verified,
	}) => {
		await assert.rejects(() => dialer.dial("ws://[2001:db8::1]:4002"), "Refused to dial 2001:db8::1: rejected");

		assert.equal(verified, ["2001:db8::1"]);
	});
});

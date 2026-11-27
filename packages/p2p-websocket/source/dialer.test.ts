import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { constants } from "./constants.js";
import { Dialer } from "./dialer.js";
import { CloseReason, ConnectionState } from "./enums.js";

describe<{
	dialer: Dialer;
	verified: string[];
	repository: any;
	rejection: CloseReason;
}>("Dialer", ({ it, assert, beforeEach, clock }) => {
	beforeEach((context) => {
		context.verified = [];
		context.repository = { get: () => undefined };
		context.rejection = CloseReason.Rejected;

		const app = new Application();
		app.bind(Identifiers.P2P.WebSocket.Connection.Factory).toConstantValue(() => {
			throw new Error("not reached");
		});
		app.bind(Identifiers.P2P.WebSocket.Connection.Repository).toConstantValue(context.repository);
		// Records the address the verifiers get and refuses it, so no socket is ever opened.
		app.bind(Identifiers.P2P.WebSocket.Connection.Verifiers).toConstantValue({
			verify: (ip: string) => {
				context.verified.push(ip);
				return context.rejection;
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

	it("should end quietly after a crossed dial when the peer's connection landed meanwhile", async (context) => {
		const { dialer, verified, repository } = context;
		const fakeTimers = clock({ toFake: ["setTimeout"] });
		context.rejection = CloseReason.DuplicatePeer;
		repository.get = () => ({ state: ConnectionState.Open });

		const dial = dialer.dial("ws://178.165.55.55:4002");
		await fakeTimers.tickAsync(constants.DIAL_RETRY_MAX_DELAY);
		await dial;

		assert.equal(verified.length, 1);
	});

	it("should dial again after a crossed dial when the address is only held by a closing connection", async (context) => {
		const { dialer, verified, repository } = context;
		const fakeTimers = clock({ toFake: ["setTimeout"] });
		context.rejection = CloseReason.DuplicatePeer;
		repository.get = () => ({ state: ConnectionState.Closing });

		const dial = dialer.dial("ws://178.165.55.55:4002").catch((error) => error);
		await fakeTimers.tickAsync(constants.DIAL_RETRY_MAX_DELAY);
		const error = await dial;

		assert.equal(verified.length, 2);
		assert.equal(error.reason, CloseReason.DuplicatePeer);
	});
});

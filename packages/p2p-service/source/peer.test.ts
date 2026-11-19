import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Enums, Events } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { Peer } from "./peer";

describe<{
	app: Application;
	peer: Peer;
}>("Peer", ({ it, assert, beforeEach, clock }) => {
	const ip = "167.184.53.78";
	const port = 4000;
	const eventDispatcher = { dispatch: () => {}, listen: () => {} };

	beforeEach((context) => {
		context.app = new Application();
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(eventDispatcher);

		context.peer = context.app.resolve(Peer).init(ip, port);
	});

	it("#socketUrl - should return the WebSocket url of the peer", ({ peer, app }) => {
		assert.equal(peer.socketUrl, `ws://${ip}:${port}`);
		assert.equal(app.resolve(Peer).init("2001:3984:3989::104", 4002).socketUrl, "ws://[2001:3984:3989::104]:4002");
	});

	it("#toBroadcast - should return a Contracts.P2PService.PeerBroadcast object for peer properties", ({ peer }) => {
		peer.version = "3.0.1";
		peer.latency = 135;

		const expectedBroadcast: Contracts.P2PService.PeerBroadcast = {
			ip,
			port: 4000,
			protocol: Enums.Api.Protocol.Http,
		};

		assert.equal(peer.toBroadcast(), expectedBroadcast);
	});

	it("#toData - should return the peer as plain data", ({ peer }) => {
		const header = { blockNumber: 7, round: 1 } as Contracts.P2PService.HeaderData;
		peer.header = header;
		peer.version = "3.0.1";
		peer.latency = 135;
		peer.plugins = { "@mainsail/api-http": { enabled: true, port: 4003 } };

		const data = peer.toData();

		assert.equal(data, {
			header,
			ip,
			latency: 135,
			plugins: { "@mainsail/api-http": { enabled: true, port: 4003 } },
			port,
			version: "3.0.1",
		});

		// Plain data all the way down, and none of it shared with the peer.
		assert.equal(JSON.parse(JSON.stringify(data)), data);
		assert.not.equal(data.header === header, true);
		peer.plugins["@mainsail/webhooks"] = { enabled: true, port: 4004 };
		assert.undefined(data.plugins["@mainsail/webhooks"]);
	});

	it("#toData - should leave the header out for a peer that has none yet", ({ peer }) => {
		assert.equal(peer.toData(), {
			header: undefined,
			ip,
			latency: undefined,
			plugins: {},
			port,
			version: undefined,
		});
	});

	it("#header - should announce a new block number or version with the peer's data", ({ peer }) => {
		const dispatched: unknown[][] = [];
		eventDispatcher.dispatch = (...arguments_: unknown[]) => void dispatched.push(arguments_);

		// The first header is the peer becoming known to us, not an update.
		peer.header = { blockNumber: 1, version: "0.0.1" } as Contracts.P2PService.HeaderData;
		peer.header = { blockNumber: 1, version: "0.0.1" } as Contracts.P2PService.HeaderData;
		assert.equal(dispatched, []);

		peer.header = { blockNumber: 2, version: "0.0.1" } as Contracts.P2PService.HeaderData;

		assert.equal(dispatched, [[Events.PeerEvent.Updated, peer.toData()]]);
		assert.equal((dispatched[0][1] as Contracts.P2PService.PeerData).header?.blockNumber, 2);

		eventDispatcher.dispatch = () => {};
	});

	it("#header - should record when a header was received", ({ peer }) => {
		const fakeTimers = clock({ now: 1_000_000, toFake: ["Date"] });
		assert.equal(peer.lastHeaderAt, 0);

		peer.header = { blockNumber: 1 } as Contracts.P2PService.HeaderData;
		assert.equal(peer.lastHeaderAt, 1_000_000);

		// An unchanged header counts too: the peer was heard from.
		fakeTimers.tick(500);
		peer.header = { blockNumber: 1 } as Contracts.P2PService.HeaderData;
		assert.equal(peer.lastHeaderAt, 1_000_500);
	});
});

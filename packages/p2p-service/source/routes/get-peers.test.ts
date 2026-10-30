import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Peer } from "../peer";
import { GetPeersRoute } from "./get-peers";

describe<{
	app: Application;
	route: GetPeersRoute;
}>("GetPeersRoute", ({ it, assert, beforeEach, stub }) => {
	const peerRepository = { getPeers: () => {} };
	const eventDispatcher = { dispatch: () => {}, listen: () => {} };

	beforeEach((context) => {
		context.app = new Application();

		context.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(peerRepository);
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(eventDispatcher);

		context.route = context.app.resolve(GetPeersRoute);
	});

	it("should return the peers except connected peer sorted by latency", async ({ route, app }) => {
		const peers = [
			app.resolve(Peer).init("180.177.54.4", 4000),
			app.resolve(Peer).init("181.177.54.4", 4000),
			app.resolve(Peer).init("182.177.54.4", 4000),
			app.resolve(Peer).init("183.177.54.4", 4000),
			app.resolve(Peer).init("184.177.54.4", 4000),
		];
		peers[0].latency = 197_634;
		peers[1].latency = 120_000;
		peers[2].latency = 117_634;
		peers[3].latency = 297_600;
		peers[4].latency = 1_197_634;

		stub(peerRepository, "getPeers").returnValue(peers);

		const connection = { remoteAddress: "180.177.54.4" } as any;
		const peersBroadcast = await route.handle(connection);

		assert.equal(peersBroadcast, {
			peers: [peers[2], peers[1], peers[3], peers[4]].map((p) => p.toBroadcast()),
		});
	});

	it("should put peers without latency last", async ({ route, app }) => {
		const peers = [
			app.resolve(Peer).init("180.177.54.4", 4000),
			app.resolve(Peer).init("181.177.54.4", 4000),
			app.resolve(Peer).init("182.177.54.4", 4000),
		];
		peers[1].latency = 120_000;
		peers[2].latency = 117_634;

		stub(peerRepository, "getPeers").returnValue(peers);

		const connection = { remoteAddress: "1.2.3.4" } as any;
		const peersBroadcast = await route.handle(connection);

		assert.equal(peersBroadcast, {
			peers: [peers[2], peers[1], peers[0]].map((p) => p.toBroadcast()),
		});
	});
});

import { Identifiers } from "@mainsail/contracts";

import { describe, Sandbox } from "../../../../test-framework";
import { Peer } from "../../peer";
import { GetPeersController } from "./get-peers";

describe<{
	sandbox: Sandbox;
	controller: GetPeersController;
}>("GetPeersController", ({ it, assert, beforeEach, stub }) => {
	const peerRepository = { getPeers: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue(peerRepository);
		context.sandbox.app.bind(Identifiers.QueueFactory).toConstantValue({});

		context.controller = context.sandbox.app.resolve(GetPeersController);
	});

	it("should return the peers except connected peer sorted by latency", async ({ controller, sandbox }) => {
		const peers = [
			sandbox.app.resolve(Peer).init("180.177.54.4", 4000),
			sandbox.app.resolve(Peer).init("181.177.54.4", 4000),
			sandbox.app.resolve(Peer).init("182.177.54.4", 4000),
			sandbox.app.resolve(Peer).init("183.177.54.4", 4000),
			sandbox.app.resolve(Peer).init("184.177.54.4", 4000),
		];
		peers[0].latency = 197_634;
		peers[1].latency = 120_000;
		peers[2].latency = 117_634;
		peers[3].latency = 297_600;
		peers[4].latency = 1_197_634;

		stub(peerRepository, "getPeers").returnValue(peers);

		const request = {
			socket: {
				info: { remoteAddress: "180.177.54.4" },
			},
		};
		const peersBroadcast = await controller.handle(request, {});

		assert.equal(
			peersBroadcast,
			[peers[2], peers[1], peers[3], peers[4]].map((p) => p.toBroadcast()),
		);
	});

	it("should return the peers except forwarded peer sorted by latency", async ({ controller, sandbox }) => {
		const peers = [
			sandbox.app.resolve(Peer).init("180.177.54.4", 4000),
			sandbox.app.resolve(Peer).init("181.177.54.4", 4000),
			sandbox.app.resolve(Peer).init("182.177.54.4", 4000),
			sandbox.app.resolve(Peer).init("183.177.54.4", 4000),
			sandbox.app.resolve(Peer).init("184.177.54.4", 4000),
		];
		peers[0].latency = 197_634;
		peers[1].latency = 120_000;
		peers[2].latency = 117_634;
		peers[3].latency = 297_600;
		peers[4].latency = 1_197_634;
		stub(peerRepository, "getPeers").returnValue(peers);

		const request = {
			socket: {
				info: { remoteAddress: "1.2.3.4", "x-forwarded-for": "180.177.54.4" },
			},
		};
		const peersBroadcast = await controller.handle(request, {});

		assert.equal(
			peersBroadcast,
			[peers[2], peers[1], peers[3], peers[4]].map((p) => p.toBroadcast()),
		);
	});
});

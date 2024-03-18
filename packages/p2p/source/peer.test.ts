import { Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

import { describe, Sandbox } from "../../test-framework/source";
import { Peer } from "./peer";

describe<{
	sandbox: Sandbox;
	peer: Peer;
}>("Peer", ({ it, assert, beforeEach, each }) => {
	const ip = "167.184.53.78";
	const port = 4000;

	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Identifiers.Services.Queue.Factory).toConstantValue({});

		context.peer = context.sandbox.app.resolve(Peer).init(ip, port);
	});

	it("#url - should return http url", ({ peer }) => {
		assert.equal(peer.url, `http://${ip}:${port}`);
	});

	each(
		"#url - should infer protocol when port is 80 or 443",
		({ context, dataset }) => {
			assert.equal(
				context.sandbox.app.resolve(Peer).init(ip, dataset[0]).url,
				`${dataset[1]}://${ip}:${dataset[0]}`,
			);
		},
		[
			[80, "http"],
			[443, "https"],
		],
	);

	it("#recentlyPinged - should return true when lastPinged is less than 2 minutes ago", ({ peer }) => {
		peer.lastPinged = dayjs();

		assert.true(peer.recentlyPinged());
	});

	it("#recentlyPinged - should return false when lastPinged is more than 2 minutes ago", ({ peer }) => {
		peer.lastPinged = dayjs().subtract(2, "minute");

		assert.false(peer.recentlyPinged());
	});

	it("#toBroadcast - should return a Contracts.P2P.PeerBroadcast object for peer properties", ({ peer }) => {
		peer.version = "3.0.1";
		peer.latency = 135;

		const expectedBroadcast: Contracts.P2P.PeerBroadcast = {
			ip,
			port: 4000,
			protocol: Contracts.P2P.PeerProtocol.Http,
		};

		assert.equal(peer.toBroadcast(), expectedBroadcast);
	});
});

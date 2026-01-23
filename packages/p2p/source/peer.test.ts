import type { Contracts } from "@mainsail/contracts";
import { Identifiers } from "@mainsail/constants";
import { Enums } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { Peer } from "./peer";

describe<{
	app: Application;
	peer: Peer;
}>("Peer", ({ it, assert, beforeEach, each }) => {
	const ip = "167.184.53.78";
	const port = 4000;
	const eventDispatcher = { dispatch: () => { }, listen: () => { } };

	beforeEach((context) => {
		context.app = new Application(new Container());
		context.app.bind(Identifiers.Services.Queue.Factory).toConstantValue({});
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(eventDispatcher);

		context.peer = context.app.resolve(Peer).init(ip, port);
	});

	it("#url - should return http url", ({ peer }) => {
		assert.equal(peer.url, `http://${ip}:${port}`);
	});

	each(
		"#url - should infer protocol when port is 80 or 443",
		({ context, dataset }) => {
			assert.equal(
				context.app.resolve(Peer).init(ip, dataset[0]).url,
				`${dataset[1]}://${ip}:${dataset[0]}`,
			);
		},
		[
			[80, "http"],
			[443, "https"],
		],
	);

	it("#toBroadcast - should return a Contracts.P2P.PeerBroadcast object for peer properties", ({ peer }) => {
		peer.version = "3.0.1";
		peer.latency = 135;

		const expectedBroadcast: Contracts.P2P.PeerBroadcast = {
			ip,
			port: 4000,
			protocol: Enums.Api.Protocol.Http,
		};

		assert.equal(peer.toBroadcast(), expectedBroadcast);
	});
});

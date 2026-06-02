import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { Peer } from "./peer";

describe<{
	app: Application;
	peer: Peer;
}>("Peer", ({ it, assert, beforeEach }) => {
	const ip = "167.184.53.78";
	const port = 4007;

	beforeEach((context) => {
		context.app = new Application();
		context.peer = context.app.resolve(Peer).init(ip, port);
	});

	it("#init - should set ip, port and protocol and return the peer", ({ app }) => {
		const peer = app.resolve(Peer);
		const result = peer.init(ip, port);

		assert.equal(result, peer);
		assert.equal(peer.ip, ip);
		assert.equal(peer.port, port);
		assert.equal(peer.protocol, Enums.Api.Protocol.Http);
		assert.equal(peer.errorCount, 0);
		assert.undefined(peer.lastPinged);
	});

	it("#url - should return http url", ({ peer }) => {
		assert.equal(peer.url, `http://${ip}:${port}`);
	});

	it("#url - should return https url when protocol is https", ({ peer }) => {
		peer.protocol = Enums.Api.Protocol.Https;

		assert.equal(peer.url, `https://${ip}:${port}`);
	});
});

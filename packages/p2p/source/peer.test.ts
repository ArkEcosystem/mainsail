import { Contracts, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

import { describe, Sandbox } from "../../test-framework";
import { Peer } from "./peer";
import { PeerVerificationResult } from "./peer-verifier";

describe<{
	sandbox: Sandbox;
	peer: Peer;
}>("Peer", ({ it, assert, beforeEach, each }) => {
	const ip = "167.184.53.78";
	const port = 4000;

	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Identifiers.QueueFactory).toConstantValue({});

		context.peer = context.sandbox.app.resolve(Peer).init(ip, port);
	});

	it("#url - should return http url", ({ peer }) => {
		assert.equal(peer.url, `http://${ip}:${port}`);
	});

	each(
		"#url - should return https url when port is multiple of 443",
		({ context, dataset }) => {
			assert.equal(context.sandbox.app.resolve(Peer).init(ip, dataset).url, `https://${ip}:${dataset}`);
		},
		[443, 886],
	);

	it("#isVerified - should return true when this.verificationResult is instanceof PeerVerificationResult", ({
		peer,
	}) => {
		peer.verificationResult = new PeerVerificationResult(12, 12, 12);

		assert.true(peer.isVerified());
	});

	it("#isVerified  - should return false when this.verificationResult is undefined", ({ peer }) => {
		assert.false(peer.isVerified());
	});

	it("#isForked - should return true when this.verificationResult.forked", ({ peer }) => {
		peer.verificationResult = new PeerVerificationResult(12, 12, 8);

		assert.true(peer.isForked());
	});

	it("#isForked - should return false when this.verificationResult is undefined", ({ peer }) => {
		assert.false(peer.isForked());
	});

	it("#isForked - should return false when this.verificationResult.forked is false", ({ peer }) => {
		peer.verificationResult = new PeerVerificationResult(12, 12, 12);

		assert.false(peer.isForked());
	});

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
		};

		assert.equal(peer.toBroadcast(), expectedBroadcast);
	});
});

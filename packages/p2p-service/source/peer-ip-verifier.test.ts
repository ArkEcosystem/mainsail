import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerIpVerifier } from "./peer-ip-verifier";

describe<{
	verifier: PeerIpVerifier;
	repository: any;
	seeds: any;
	configuration: any;
}>("PeerIpVerifier", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.repository = { getSameSubnetPeers: () => [] };
		context.seeds = { isSeed: () => false };
		context.configuration = {
			getRequired: (key: string) => ({ blacklist: [], maxSameSubnetPeers: 5, whitelist: ["*"] })[key],
		};

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
			.whenTagged("plugin", "p2p-service");
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Seeds).toConstantValue(context.seeds);
		app.bind(Identifiers.P2P.Logger).toConstantValue({ warnExtra: () => {} });

		context.verifier = app.resolve(PeerIpVerifier);
	});

	it("should pass a public address", ({ verifier }) => {
		assert.undefined(verifier.verify("178.165.55.55"));
	});

	it("should reject localhost and invalid addresses", ({ verifier }) => {
		assert.equal(verifier.verify("127.0.0.1"), CloseReason.Rejected);
		assert.equal(verifier.verify("not-an-ip"), CloseReason.Rejected);
	});

	it("should reject addresses outside the whitelist", ({ verifier, configuration }) => {
		configuration.getRequired = (key: string) =>
			({ blacklist: [], maxSameSubnetPeers: 5, whitelist: ["178.165.*"] })[key];

		assert.undefined(verifier.verify("178.165.55.55"));
		assert.equal(verifier.verify("179.165.55.55"), CloseReason.Rejected);
	});

	it("should reject blacklisted addresses", ({ verifier, configuration }) => {
		configuration.getRequired = (key: string) =>
			({ blacklist: ["178.165.55.55"], maxSameSubnetPeers: 5, whitelist: ["*"] })[key];

		assert.equal(verifier.verify("178.165.55.55"), CloseReason.Rejected);
		assert.undefined(verifier.verify("178.165.55.56"));
	});

	it("should reject an address from a /24 subnet that is at its limit, except seeds", ({
		verifier,
		repository,
		seeds,
	}) => {
		repository.getSameSubnetPeers = () => Array.from({ length: 5 }, (_, index) => ({ ip: `178.165.55.${index}` }));

		assert.equal(verifier.verify("178.165.55.56"), CloseReason.Rejected);

		seeds.isSeed = (ip: string) => ip === "178.165.55.55";
		assert.undefined(verifier.verify("178.165.55.55"));
	});
});

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerIpVerifier } from "./peer-ip-verifier";

describe<{
	verifier: PeerIpVerifier;
	configuration: any;
}>("PeerIpVerifier", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.configuration = {
			getRequired: (key: string) => ({ blacklist: [], whitelist: ["*"] })[key],
		};

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
			.whenTagged("plugin", "p2p-service");

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
		configuration.getRequired = (key: string) => ({ blacklist: [], whitelist: ["178.165.*"] })[key];

		assert.undefined(verifier.verify("178.165.55.55"));
		assert.equal(verifier.verify("179.165.55.55"), CloseReason.Rejected);
	});

	it("should reject blacklisted addresses", ({ verifier, configuration }) => {
		configuration.getRequired = (key: string) => ({ blacklist: ["178.165.55.55"], whitelist: ["*"] })[key];

		assert.equal(verifier.verify("178.165.55.55"), CloseReason.Rejected);
		assert.undefined(verifier.verify("178.165.55.56"));
	});
});

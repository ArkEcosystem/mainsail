import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { PeerVerifier } from "./peer-verifier";

const status = {
	config: { network: { nethash: "nethash" }, plugins: { "@mainsail/api-http": { port: 4003 } }, version: "1.0.0" },
	state: { blockNumber: 1 },
};

describe<{
	peerVerifier: PeerVerifier;
	communicator: any;
	peerDisposer: any;
	configuration: any;
	peer: any;
}>("PeerVerifier", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.peer = { ip: "1.1.1.1" };
		context.communicator = { getBlocks: async () => ({ blocks: [] }), getStatus: async () => status };
		context.peerDisposer = { banPeer: () => {} };
		context.configuration = { getRequired: () => false };

		const app = new Application();
		app.bind(Identifiers.P2P.Peer.Communicator).toConstantValue(context.communicator);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		app.bind(Identifiers.Cryptography.Configuration).toConstantValue({
			getNetwork: () => ({ nethash: "nethash" }),
		});
		app.bind(Identifiers.State.Store).toConstantValue({});
		app.bind(Identifiers.Database.Service).toConstantValue({});
		app.bind(Identifiers.Cryptography.Commit.Factory).toConstantValue({});
		app.bind(Identifiers.P2P.Logger).toConstantValue({ debugExtra: () => {} });
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(context.configuration)
			.whenTagged("plugin", "p2p-service");

		context.peerVerifier = app.resolve(PeerVerifier);
	});

	it("should request the status but check nothing when the verification is skipped", async ({
		peerVerifier,
		communicator,
		configuration,
		peer,
	}) => {
		configuration.getRequired = () => true;
		// A peer on another network passes: nothing is checked.
		communicator.getStatus = async () => ({
			...status,
			config: { ...status.config, network: { nethash: "other" } },
		});
		const getStatus = spy(communicator, "getStatus");
		const getBlocks = spy(communicator, "getBlocks");

		assert.true(await peerVerifier.verify(peer));

		getStatus.calledWith(peer);
		getBlocks.neverCalled();
		assert.equal(peer.version, "1.0.0");
		assert.equal(peer.plugins, status.config.plugins);
	});

	it("should fail and hand the error to the disposer when the status request fails, also when skipped", async ({
		peerVerifier,
		communicator,
		configuration,
		peerDisposer,
		peer,
	}) => {
		configuration.getRequired = () => true;
		const error = new Error("boom");
		communicator.getStatus = async () => {
			throw error;
		};
		const banPeer = spy(peerDisposer, "banPeer");

		assert.false(await peerVerifier.verify(peer));

		banPeer.calledWith("1.1.1.1", error);
	});

	it("should fail a peer on another network when the verification is not skipped", async ({
		peerVerifier,
		communicator,
		peerDisposer,
		peer,
	}) => {
		communicator.getStatus = async () => ({
			...status,
			config: { ...status.config, network: { nethash: "other" } },
		});
		const banPeer = spy(peerDisposer, "banPeer");

		assert.false(await peerVerifier.verify(peer));

		assert.equal(banPeer.getCallArgs(0)[1].message, "Invalid nethash");
	});
});

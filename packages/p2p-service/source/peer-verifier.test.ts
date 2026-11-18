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
	peer: any;
}>("PeerVerifier", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.peer = { ip: "1.1.1.1" };
		context.communicator = { getBlocks: async () => ({ blocks: [] }), getStatus: async () => status };
		context.peerDisposer = { banPeer: () => {} };

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

		context.peerVerifier = app.resolve(PeerVerifier);
	});

	it("should fail and hand the error to the disposer when the status request fails", async ({
		peerVerifier,
		communicator,
		peerDisposer,
		peer,
	}) => {
		const error = new Error("boom");
		communicator.getStatus = async () => {
			throw error;
		};
		const banPeer = spy(peerDisposer, "banPeer");

		assert.false(await peerVerifier.verify(peer));

		banPeer.calledWith("1.1.1.1", error);
	});

	it("should record the version and fail a peer on another network", async ({
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
		assert.equal(peer.version, "1.0.0");
	});
});

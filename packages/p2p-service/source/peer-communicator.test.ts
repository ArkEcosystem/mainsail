import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason, ConnectionState } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerCommunicator } from "./peer-communicator";
import { GetBlocks, GetStatus, PostMessage } from "./routes/index.js";

const headers = {
	blockNumber: 1,
	round: 0,
	step: 0,
	validatorsSignedPrecommit: [],
	validatorsSignedPrevote: [],
	version: "1",
};

describe<{
	communicator: PeerCommunicator;
	peer: any;
	connection: any;
	headerService: any;
	peerDisposer: any;
}>("PeerCommunicator", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.connection = {
			send: async () => ({ headers }),
			state: ConnectionState.Open,
		};
		context.peer = { connection: context.connection, ip: "1.1.1.1", setPinged: () => {} };
		context.headerService = { handle: async () => {} };
		context.peerDisposer = { banPeer: () => {} };

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue({ getRequired: (key: string) => ({ getBlocksTimeout: 30_000 })[key] })
			.whenTagged("plugin", "p2p-service");
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		app.bind(Identifiers.P2P.Header.Service).toConstantValue(context.headerService);
		app.bind(Identifiers.P2P.Logger).toConstantValue({ debug: () => {} });

		context.communicator = app.resolve(PeerCommunicator);
	});

	it("should send through the peer's connection and hand the response headers to the header service", async ({
		communicator,
		peer,
		connection,
		headerService,
	}) => {
		const send = spy(connection, "send");
		const handle = spy(headerService, "handle");
		const setPinged = spy(peer, "setPinged");

		await communicator.getStatus(peer);

		assert.equal(send.getCallArgs(0)[0], GetStatus);
		assert.equal(send.getCallArgs(0)[2], {});
		handle.calledWith(peer, headers);
		setPinged.calledOnce();
	});

	it("should give getBlocks the configured timeout", async ({ communicator, peer, connection }) => {
		const send = spy(connection, "send");

		await communicator.getBlocks(peer, { fromBlockNumber: 5 });

		assert.equal(send.getCallArgs(0)[0], GetBlocks);
		assert.equal(send.getCallArgs(0)[1], { fromBlockNumber: 5, limit: 400 });
		assert.equal(send.getCallArgs(0)[2], { timeout: 30_000 });
	});

	it("should fail without an open connection instead of dialing", async ({ communicator, peer }) => {
		peer.connection.state = ConnectionState.Closed;

		const error = await communicator.getStatus(peer).catch((error) => error);

		assert.equal(error.reason, CloseReason.NotOpen);
	});

	it("should report a failed post to the disposer instead of throwing", async ({
		communicator,
		peer,
		connection,
		peerDisposer,
	}) => {
		connection.send = async () => {
			throw new Error("bad");
		};
		const banPeer = spy(peerDisposer, "banPeer");
		const send = spy(connection, "send");

		await communicator.postMessage(peer, Buffer.from("m"));

		assert.equal(send.getCallArgs(0)[0], PostMessage);
		assert.equal(banPeer.getCallArgs(0)[0], "1.1.1.1");
	});
});

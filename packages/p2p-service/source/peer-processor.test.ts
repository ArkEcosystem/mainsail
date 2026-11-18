import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason, ConnectionState } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerProcessor } from "./peer-processor";

const makePeer = (ip: string): any => ({ dialAttempts: 0, ip, lastDialAt: 0, port: 4002, version: "0.0.1" });

// The hook does not return the verification promise; a macrotask lets the whole flow settle.
const connect = async (websocketService: any, ip: string): Promise<any> => {
	const connection: any = {
		onClose: (listener: (reason: string, error?: Error) => void) => (connection.close = listener),
		remoteAddress: ip,
		state: ConnectionState.Open,
	};
	websocketService.onConnection(connection);
	await new Promise((resolve) => setImmediate(resolve));

	return connection;
};

describe<{
	processor: PeerProcessor;
	repository: any;
	peerVerifier: any;
	peerDisposer: any;
	events: any;
	logger: any;
	transactionPoolWorker: any;
	peerDiscoverer: any;
	websocketService: any;
	dialQueue: any;
}>("PeerProcessor", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.logger = { debug: () => {}, warn: () => {}, warnExtra: () => {} };
		context.repository = {
			forgetKnownPeer: () => {},
			forgetPendingPeer: () => {},
			getKnownPeer: () => {},
			getActivePeers: () => [],
			hasActivePeer: () => false,
			hasKnownPeer: () => false,
			hasPeer: () => false,
			hasPendingPeer: () => false,
			setKnownPeer: () => {},
			setActivePeer: () => {},
			setPendingPeer: () => {},
		};
		context.peerVerifier = { verify: async () => true };
		context.peerDisposer = { banPeer: () => {}, disposePeer: () => {} };
		context.events = { dispatch: async () => {}, listen: () => {} };
		context.transactionPoolWorker = { registerEventHandler: () => {} };
		context.peerDiscoverer = { discoverPeers: async () => {} };
		context.websocketService = { onConnection: undefined };
		context.dialQueue = { add: () => {} };

		const app = new Application();
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Verifier).toConstantValue(context.peerVerifier);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		app.bind(Identifiers.P2P.Peer.Discoverer).toConstantValue(context.peerDiscoverer);
		app.bind(Identifiers.P2P.Peer.Factory).toConstantValue((ip: string) => makePeer(ip));
		app.bind(Identifiers.P2P.WebSocket.Service).toConstantValue(context.websocketService);
		app.bind(Identifiers.P2P.Peer.DialQueue).toConstantValue(context.dialQueue);
		app.bind(Identifiers.TransactionPool.Worker).toConstantValue(context.transactionPoolWorker);
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);

		context.processor = app.resolve(PeerProcessor);
	});

	it("#validateAndAcceptPeer - should queue a new address for dialing and record nothing", ({
		processor,
		repository,
		dialQueue,
		peerVerifier,
	}) => {
		const add = spy(dialQueue, "add");
		const setKnownPeer = spy(repository, "setKnownPeer");
		const verify = spy(peerVerifier, "verify");

		processor.validateAndAcceptPeer("::ffff:178.165.55.55");

		add.calledWith("178.165.55.55");
		setKnownPeer.neverCalled();
		verify.neverCalled();
	});

	it("#validateAndAcceptPeer - should skip invalid addresses and peers the repository already holds", ({
		processor,
		repository,
		dialQueue,
	}) => {
		const add = spy(dialQueue, "add");

		processor.validateAndAcceptPeer("not-an-ip");
		repository.hasPeer = () => true;
		processor.validateAndAcceptPeer("178.165.55.55");

		add.neverCalled();
	});

	it("#onConnection - should bind the connection to a new peer, verify it and make it active", async ({
		websocketService,
		repository,
		peerDiscoverer,
	}) => {
		const setPendingPeer = spy(repository, "setPendingPeer");
		const setPeer = spy(repository, "setActivePeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const discoverPeers = spy(peerDiscoverer, "discoverPeers");

		const connection = await connect(websocketService, "178.165.55.55");

		const peer = setPeer.getCallArgs(0)[0];
		assert.equal(peer.ip, "178.165.55.55");
		assert.equal(peer.connection, connection);
		setPendingPeer.calledWith(peer);
		discoverPeers.calledWith(peer);
		forgetPendingPeer.calledWith(peer);
	});

	it("#onConnection - should reuse the known peer for the address", async ({ websocketService, repository }) => {
		const known = makePeer("178.165.55.55");
		repository.hasKnownPeer = () => true;
		repository.getKnownPeer = () => known;
		const setPeer = spy(repository, "setActivePeer");

		const connection = await connect(websocketService, "178.165.55.55");

		setPeer.calledWith(known);
		assert.equal(known.connection, connection);
	});

	it("#onConnection - should clear the dial attempts only when the peer becomes active", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const known = { ...makePeer("178.165.55.55"), dialAttempts: 3 };
		repository.hasKnownPeer = () => true;
		repository.getKnownPeer = () => known;

		peerVerifier.verify = async () => false;
		await connect(websocketService, "178.165.55.55");
		assert.equal(known.dialAttempts, 3);

		peerVerifier.verify = async () => true;
		await connect(websocketService, "178.165.55.55");
		assert.equal(known.dialAttempts, 0);
	});

	it("#onConnection - should keep a known peer known when its verification fails", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const known = makePeer("178.165.55.55");
		repository.hasKnownPeer = () => true;
		repository.getKnownPeer = () => known;
		peerVerifier.verify = async () => false;
		const setPendingPeer = spy(repository, "setPendingPeer");
		const forgetKnownPeer = spy(repository, "forgetKnownPeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");

		await connect(websocketService, "178.165.55.55");

		setPendingPeer.calledWith(known);
		forgetKnownPeer.neverCalled();
		forgetPendingPeer.calledWith(known);
	});

	it("#onConnection - should keep a known peer known when its connection closed during the verification", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const known = makePeer("178.165.55.55");
		repository.hasKnownPeer = () => true;
		repository.getKnownPeer = () => known;
		peerVerifier.verify = async (peer: any) => {
			peer.connection.state = ConnectionState.Closed;
			return true;
		};
		const forgetKnownPeer = spy(repository, "forgetKnownPeer");
		const setPeer = spy(repository, "setActivePeer");

		await connect(websocketService, "178.165.55.55");

		forgetKnownPeer.neverCalled();
		setPeer.neverCalled();
	});

	it("#onConnection - should skip peers that are already active or pending", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const verify = spy(peerVerifier, "verify");

		repository.hasActivePeer = () => true;
		await connect(websocketService, "178.165.55.55");
		repository.hasActivePeer = () => false;
		repository.hasPendingPeer = () => true;
		await connect(websocketService, "178.165.55.55");

		verify.neverCalled();
	});

	it("#onConnection - should not activate a peer when verification fails", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		peerVerifier.verify = async () => false;
		const setPeer = spy(repository, "setActivePeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");

		await connect(websocketService, "178.165.55.55");

		setPeer.neverCalled();
		forgetPendingPeer.calledOnce();
	});

	it("#onConnection - should not activate a peer whose connection closed during the verification", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		peerVerifier.verify = async (peer: any) => {
			peer.connection.state = ConnectionState.Closed;
			return true;
		};
		const setPeer = spy(repository, "setActivePeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");

		await connect(websocketService, "178.165.55.55");

		setPeer.neverCalled();
		forgetPendingPeer.calledOnce();
	});

	it("#onConnection - should forget the pending peer and dispose it when accepting throws", async ({
		websocketService,
		repository,
		peerDiscoverer,
		peerDisposer,
	}) => {
		peerDiscoverer.discoverPeers = async () => {
			throw new Error("boom");
		};
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const disposePeer = spy(peerDisposer, "disposePeer");

		await connect(websocketService, "178.165.55.55");

		forgetPendingPeer.calledOnce();
		disposePeer.calledWith("178.165.55.55");
	});

	it("#onConnection - should dispose the peer when its connection closes", async ({
		websocketService,
		peerDisposer,
	}) => {
		const disposePeer = spy(peerDisposer, "disposePeer");

		const connection = await connect(websocketService, "178.165.55.55");

		disposePeer.neverCalled();
		connection.close(CloseReason.RemoteClose);
		disposePeer.calledWith("178.165.55.55");
	});

	it("#onConnection - should ban the peer when it caused the close", async ({ websocketService, peerDisposer }) => {
		const banPeer = spy(peerDisposer, "banPeer");
		const disposePeer = spy(peerDisposer, "disposePeer");

		const connection = await connect(websocketService, "178.165.55.55");
		connection.close(CloseReason.PayloadTooLarge, new Error("too big"));

		disposePeer.neverCalled();
		assert.equal(banPeer.getCallArgs(0)[0], "178.165.55.55");
		assert.equal(banPeer.getCallArgs(0)[1].message, "Connection closed: payloadTooLarge (too big)");
	});
});

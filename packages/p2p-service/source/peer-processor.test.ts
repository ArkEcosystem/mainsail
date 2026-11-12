import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { ConnectionState } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerProcessor } from "./peer-processor";

const makePeer = (ip: string): any => ({ ip, port: 4002, version: "0.0.1" });

// The hook does not return the verification promise; a macrotask lets the whole flow settle.
const connect = async (websocketService: any, ip: string): Promise<any> => {
	const connection: any = {
		onClose: (listener: () => void) => (connection.close = listener),
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
		context.peerDisposer = { disposePeer: () => {} };
		context.events = { dispatch: async () => {}, listen: () => {} };
		context.transactionPoolWorker = { registerEventHandler: () => {} };
		context.peerDiscoverer = { discoverPeers: async () => {} };
		context.websocketService = { dial: async () => {}, onConnection: undefined };

		const app = new Application();
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Verifier).toConstantValue(context.peerVerifier);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		app.bind(Identifiers.P2P.Peer.Discoverer).toConstantValue(context.peerDiscoverer);
		app.bind(Identifiers.P2P.Peer.Factory).toConstantValue((ip: string) => makePeer(ip));
		app.bind(Identifiers.P2P.WebSocket.Service).toConstantValue(context.websocketService);
		app.bind(Identifiers.TransactionPool.Worker).toConstantValue(context.transactionPoolWorker);
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);

		context.processor = app.resolve(PeerProcessor);
	});

	it("#validateAndAcceptPeer - should dial a new address and record nothing", async ({
		processor,
		repository,
		websocketService,
		peerVerifier,
	}) => {
		const dial = spy(websocketService, "dial");
		const setKnownPeer = spy(repository, "setKnownPeer");
		const verify = spy(peerVerifier, "verify");

		await processor.validateAndAcceptPeer("::ffff:178.165.55.55");

		dial.calledWith("ws://178.165.55.55:4002");
		setKnownPeer.neverCalled();
		verify.neverCalled();
	});

	it("#validateAndAcceptPeer - should swallow a failed dial", async ({ processor, websocketService, logger }) => {
		websocketService.dial = async () => {
			throw new Error("ECONNREFUSED");
		};
		const debug = spy(logger, "debug");

		await processor.validateAndAcceptPeer("178.165.55.55");

		debug.calledWith("Dial to 178.165.55.55:4002 failed: ECONNREFUSED", "p2p");
	});

	it("#validateAndAcceptPeer - should skip invalid addresses and peers the repository already holds", async ({
		processor,
		repository,
		websocketService,
	}) => {
		const dial = spy(websocketService, "dial");

		await processor.validateAndAcceptPeer("not-an-ip");
		repository.hasPeer = () => true;
		await processor.validateAndAcceptPeer("178.165.55.55");

		dial.neverCalled();
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
		const forgetKnownPeer = spy(repository, "forgetKnownPeer");
		const setPeer = spy(repository, "setActivePeer");

		const connection = await connect(websocketService, "178.165.55.55");

		forgetKnownPeer.calledWith(known);
		setPeer.calledWith(known);
		assert.equal(known.connection, connection);
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
		connection.close();
		disposePeer.calledWith("178.165.55.55");
	});
});

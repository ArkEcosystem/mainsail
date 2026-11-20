import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason, ConnectionState } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerProcessor } from "./peer-processor";

const ip = "178.165.55.55";

const makePeer = (ip: string): any => ({ dialAttempts: 0, ip, lastDialAt: 0, port: 4002 });

// The three lists with the transitions the processor relies on, as the real repository makes them.
const makeRepository = (): any => {
	const active = new Map<string, any>();
	const pending = new Map<string, any>();
	const known = new Map<string, any>();

	return {
		demotePeer: (ip: string) => {
			const peer = active.get(ip);
			if (peer) {
				active.delete(ip);
				known.set(ip, peer);
			}
			pending.delete(ip);
		},
		getActivePeers: () => [...active.values()],
		getKnownPeer: (ip: string) => known.get(ip),
		getPendingPeers: () => [...pending.values()],
		hasActivePeer: (ip: string) => active.has(ip),
		hasKnownPeer: (ip: string) => known.has(ip),
		hasPendingPeer: (ip: string) => pending.has(ip),
		setActivePeer: (peer: any) => {
			pending.delete(peer.ip);
			known.delete(peer.ip);
			active.set(peer.ip, peer);
		},
		setKnownPeer: (peer: any) => known.set(peer.ip, peer),
		setPendingPeer: (peer: any) => pending.set(peer.ip, peer),
	};
};

// The hook does not return the verification promise; a macrotask lets the whole flow settle.
const settle = async (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

const connect = async (websocketService: any, ip: string): Promise<any> => {
	const connection: any = {
		close: async () => {},
		onClose: (listener: (reason: string, error?: Error) => void) => (connection.fireClose = listener),
		remoteAddress: ip,
		remoteVersion: "0.0.1",
		state: ConnectionState.Open,
	};
	websocketService.onConnection(connection);
	await settle();

	return connection;
};

// A verification the test finishes by hand, to let something happen while it runs.
const deferVerification = (peerVerifier: any): ((verified: boolean) => void)[] => {
	const finish: ((verified: boolean) => void)[] = [];
	peerVerifier.verify = () => new Promise<boolean>((resolve) => finish.push(resolve));

	return finish;
};

describe<{
	processor: PeerProcessor;
	repository: any;
	peerVerifier: any;
	peerDisposer: any;
	logger: any;
	transactionPoolWorker: any;
	peerDiscoverer: any;
	websocketService: any;
}>("PeerProcessor", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.logger = { debug: () => {}, info: () => {}, warn: () => {}, warnExtra: () => {} };
		context.repository = makeRepository();
		context.peerVerifier = { verify: async () => true };
		// As the real disposer: the peer loses its place, an active one becomes known.
		context.peerDisposer = { banPeer: () => {}, disposePeer: (ip: string) => context.repository.demotePeer(ip) };
		context.transactionPoolWorker = { registerEventHandler: () => {} };
		context.peerDiscoverer = { discoverPeers: async () => {} };
		context.websocketService = { onConnection: undefined };

		const app = new Application();
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Verifier).toConstantValue(context.peerVerifier);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		app.bind(Identifiers.P2P.Peer.Discoverer).toConstantValue(context.peerDiscoverer);
		app.bind(Identifiers.P2P.Peer.Factory).toConstantValue((ip: string) => makePeer(ip));
		app.bind(Identifiers.P2P.WebSocket.Service).toConstantValue(context.websocketService);
		app.bind(Identifiers.TransactionPool.Worker).toConstantValue(context.transactionPoolWorker);
		app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);

		context.processor = app.resolve(PeerProcessor);
	});

	it("#onConnection - should bind the connection to a new peer, verify it and make it active", async ({
		websocketService,
		repository,
		peerVerifier,
		peerDiscoverer,
	}) => {
		const verify = spy(peerVerifier, "verify");
		const discoverPeers = spy(peerDiscoverer, "discoverPeers");

		const connection = await connect(websocketService, ip);
		const close = spy(connection, "close");

		const [peer] = repository.getActivePeers();
		assert.equal(peer.ip, ip);
		assert.equal(peer.connection, connection);
		assert.false(repository.hasPendingPeer(ip));
		verify.calledWith(peer);
		discoverPeers.calledWith(peer);
		close.neverCalled();
	});

	it("#onConnection - should log an accepted peer, and only once it is active", async ({
		websocketService,
		peerVerifier,
		logger,
	}) => {
		const finish = deferVerification(peerVerifier);
		const info = spy(logger, "info");

		await connect(websocketService, ip);
		info.neverCalled();

		finish[0](true);
		await settle();
		info.calledOnce();
		assert.true(info.getCallArgs(0)[0].startsWith(`Accepted new peer ${ip}:`));
	});

	it("#onConnection - should keep the peer pending while it is verified", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const finish = deferVerification(peerVerifier);

		await connect(websocketService, ip);

		assert.true(repository.hasPendingPeer(ip));
		assert.false(repository.hasActivePeer(ip));

		finish[0](true);
		await settle();

		assert.false(repository.hasPendingPeer(ip));
		assert.true(repository.hasActivePeer(ip));
	});

	it("#onConnection - should reuse the known peer for the address", async ({ websocketService, repository }) => {
		const known = makePeer(ip);
		repository.setKnownPeer(known);

		const connection = await connect(websocketService, ip);

		assert.equal(repository.getActivePeers(), [known]);
		assert.false(repository.hasKnownPeer(ip));
		assert.equal(known.connection, connection);
	});

	it("#onConnection - should clear the dial attempts only when the peer becomes active", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const known = { ...makePeer(ip), dialAttempts: 3 };
		repository.setKnownPeer(known);

		peerVerifier.verify = async () => false;
		const failed = await connect(websocketService, ip);
		failed.fireClose(CloseReason.LocalClose);
		assert.equal(known.dialAttempts, 3);

		peerVerifier.verify = async () => true;
		await connect(websocketService, ip);
		assert.equal(known.dialAttempts, 0);
	});

	it("#onConnection - should close the connection of a peer that fails the verification", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const finish = deferVerification(peerVerifier);

		const connection = await connect(websocketService, ip);
		const close = spy(connection, "close");
		finish[0](false);
		await settle();

		// The verification left the connection open; without a peer it would have no owner.
		close.calledOnce();
		assert.false(repository.hasActivePeer(ip));

		// The close listener clears the lists; an address seen for the first time is dropped.
		connection.fireClose(CloseReason.LocalClose);
		assert.false(repository.hasPendingPeer(ip));
		assert.false(repository.hasKnownPeer(ip));
	});

	it("#onConnection - should keep a known peer known when its verification fails", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const known = makePeer(ip);
		repository.setKnownPeer(known);
		peerVerifier.verify = async () => false;

		const connection = await connect(websocketService, ip);
		connection.fireClose(CloseReason.LocalClose);

		assert.false(repository.hasActivePeer(ip));
		assert.false(repository.hasPendingPeer(ip));
		assert.equal(repository.getKnownPeer(ip), known);
	});

	it("#onConnection - should not activate a peer whose connection closed during the verification", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const known = makePeer(ip);
		repository.setKnownPeer(known);
		const finish = deferVerification(peerVerifier);

		const connection = await connect(websocketService, ip);
		connection.state = ConnectionState.Closed;
		connection.fireClose(CloseReason.RemoteClose);
		finish[0](true);
		await settle();

		assert.false(repository.hasActivePeer(ip));
		assert.false(repository.hasPendingPeer(ip));
		assert.equal(repository.getKnownPeer(ip), known);
	});

	it("#onConnection - should not activate a peer whose connection is closing", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const finish = deferVerification(peerVerifier);

		const connection = await connect(websocketService, ip);
		const close = spy(connection, "close");
		// The close has begun but its listeners have not run yet.
		connection.state = ConnectionState.Closing;
		finish[0](true);
		await settle();

		assert.false(repository.hasActivePeer(ip));
		close.neverCalled();

		connection.fireClose(CloseReason.LocalClose);
		assert.false(repository.hasPendingPeer(ip));
	});

	it("#onConnection - should leave a peer alone that was banned during the verification", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const finish = deferVerification(peerVerifier);

		const connection = await connect(websocketService, ip);
		const close = spy(connection, "close");
		// A ban removes the peer from every list and tears its connection down itself.
		repository.demotePeer(ip);
		connection.state = ConnectionState.Closing;
		finish[0](false);
		await settle();

		assert.false(repository.hasActivePeer(ip));
		close.neverCalled();
	});

	it("#onConnection - should ignore a verification that outlived its connection, for a known peer", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const known = makePeer(ip);
		repository.setKnownPeer(known);
		const finish = deferVerification(peerVerifier);

		const first = await connect(websocketService, ip);
		first.state = ConnectionState.Closed;
		first.fireClose(CloseReason.RemoteClose);

		// The same peer object is bound to the second connection and verified again.
		const second = await connect(websocketService, ip);
		const close = spy(second, "close");
		assert.equal(known.connection, second);

		// The first verification must neither activate the peer nor clear the second one's pending entry.
		finish[0](true);
		await settle();
		assert.false(repository.hasActivePeer(ip));
		assert.equal(repository.getPendingPeers(), [known]);
		close.neverCalled();

		finish[1](true);
		await settle();
		assert.equal(repository.getActivePeers(), [known]);
	});

	it("#onConnection - should ignore a verification that outlived its connection, for a new peer", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const finish = deferVerification(peerVerifier);

		const first = await connect(websocketService, ip);
		first.state = ConnectionState.Closed;
		first.fireClose(CloseReason.RemoteClose);

		const second = await connect(websocketService, ip);
		const close = spy(second, "close");
		const [pending] = repository.getPendingPeers();

		// A failed first verification must not drop the second peer or close its connection.
		finish[0](false);
		await settle();
		assert.equal(repository.getPendingPeers(), [pending]);
		close.neverCalled();

		finish[1](true);
		await settle();
		assert.equal(repository.getActivePeers(), [pending]);
		assert.equal(pending.connection, second);
	});

	it("#onConnection - should close a connection for an address that is already active or pending", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const verify = spy(peerVerifier, "verify");

		for (const occupy of [repository.setActivePeer, repository.setPendingPeer]) {
			const peer = makePeer(ip);
			occupy(peer);

			const connection: any = { close: async () => {}, onClose: () => {}, remoteAddress: ip };
			const close = spy(connection, "close");
			websocketService.onConnection(connection);
			await settle();

			close.calledOnce();
			repository.demotePeer(ip);
			repository.demotePeer(ip);
		}

		verify.neverCalled();
	});

	it("#onConnection - should log and close the connection when asking the peer for peers throws", async ({
		websocketService,
		peerDiscoverer,
		logger,
	}) => {
		peerDiscoverer.discoverPeers = async () => {
			throw new Error("boom");
		};
		const debug = spy(logger, "debug");

		const connection: any = {
			close: async () => {},
			onClose: () => {},
			remoteAddress: ip,
			state: ConnectionState.Open,
		};
		const close = spy(connection, "close");
		websocketService.onConnection(connection);
		await settle();

		debug.calledWith(`Accepting the connection of ${ip} failed: boom`, "p2p");
		close.calledOnce();
	});

	it("#onConnection - should log a failure to accept the connection and close it", async ({
		websocketService,
		repository,
		logger,
	}) => {
		repository.setPendingPeer = () => {
			throw new Error("boom");
		};
		const debug = spy(logger, "debug");

		const connection: any = {
			close: async () => {},
			onClose: () => {},
			remoteAddress: ip,
			state: ConnectionState.Open,
		};
		const close = spy(connection, "close");
		websocketService.onConnection(connection);
		await settle();

		debug.calledWith(`Accepting the connection of ${ip} failed: boom`, "p2p");
		close.calledOnce();
	});

	it("#onConnection - should dispose the peer when its connection closes", async ({
		websocketService,
		repository,
		peerDisposer,
	}) => {
		const disposePeer = spy(peerDisposer, "disposePeer");

		const connection = await connect(websocketService, ip);

		disposePeer.neverCalled();
		connection.fireClose(CloseReason.RemoteClose);
		disposePeer.calledWith(ip);
		assert.false(repository.hasActivePeer(ip));
		assert.true(repository.hasKnownPeer(ip));
	});

	it("#onConnection - should ban the peer when it caused the close", async ({ websocketService, peerDisposer }) => {
		const banPeer = spy(peerDisposer, "banPeer");
		const disposePeer = spy(peerDisposer, "disposePeer");

		const connection = await connect(websocketService, ip);
		connection.fireClose(CloseReason.PayloadTooLarge, new Error("too big"));

		disposePeer.neverCalled();
		assert.equal(banPeer.getCallArgs(0)[0], ip);
		assert.equal(banPeer.getCallArgs(0)[1].message, "Connection closed: payloadTooLarge (too big)");
	});
});

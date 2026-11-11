import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { CloseReason } from "@mainsail/p2p-websocket";
import { describe } from "@mainsail/test-runner";

import { PeerProcessor } from "./peer-processor";

const makePeer = (ip: string): any => ({ ip, port: 4002, version: "0.0.1" });
const makeConnection = (ip: string): any => ({ onClose: () => {}, remoteAddress: ip });

// The hook does not return the verification promise; a macrotask lets the whole flow settle.
const connect = async (websocketService: any, ip: string): Promise<void> => {
	websocketService.onConnection(makeConnection(ip));
	await new Promise((resolve) => setImmediate(resolve));
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
	peerIpVerifier: any;
	seeds: any;
	configuration: any;
}>("PeerProcessor", ({ it, assert, beforeEach, spy }) => {
	beforeEach((context) => {
		context.logger = { debug: () => {}, warn: () => {}, warnExtra: () => {} };
		context.repository = {
			forgetKnownPeer: () => {},
			forgetPendingPeer: () => {},
			getPeers: () => [],
			getSameSubnetPeers: () => [],
			hasKnownPeer: () => false,
			hasPeer: () => false,
			hasPendingPeer: () => false,
			setKnownPeer: () => {},
			setPeer: () => {},
			setPendingPeer: () => {},
		};
		context.peerVerifier = { verify: async () => true };
		context.peerDisposer = { banPeer: () => {}, disposePeer: () => {}, isBanned: () => false };
		context.events = { dispatch: async () => {}, listen: () => {} };
		context.transactionPoolWorker = { registerEventHandler: () => {}, setPeer: async () => {} };
		context.peerDiscoverer = { discoverPeers: async () => {} };
		context.websocketService = { onConnection: undefined };
		context.peerIpVerifier = { verify: () => undefined };
		context.seeds = { isSeed: () => false };

		context.configuration = {
			getOptional: (key: string, defaultValue: unknown) => defaultValue,
			getRequired: (key: string) => ({ blacklist: [], maxSameSubnetPeers: 5, whitelist: ["*"] })[key],
		};
		const configuration = context.configuration;

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration)
			.toConstantValue(configuration)
			.whenTagged("plugin", "p2p-service");
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Verifier).toConstantValue(context.peerVerifier);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		app.bind(Identifiers.P2P.Peer.Discoverer).toConstantValue(context.peerDiscoverer);
		app.bind(Identifiers.P2P.Peer.Factory).toConstantValue((ip: string) => makePeer(ip));
		app.bind(Identifiers.P2P.WebSocket.Service).toConstantValue(context.websocketService);
		app.bind(Identifiers.P2P.Peer.IpVerifier).toConstantValue(context.peerIpVerifier);
		app.bind(Identifiers.P2P.Peer.Seeds).toConstantValue(context.seeds);
		app.bind(Identifiers.TransactionPool.Worker).toConstantValue(context.transactionPoolWorker);
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);

		context.processor = app.resolve(PeerProcessor);
	});

	it("#validateAndAcceptPeer - should record a valid address as known without verifying it", async ({
		processor,
		repository,
		peerVerifier,
	}) => {
		const setKnownPeer = spy(repository, "setKnownPeer");
		const verify = spy(peerVerifier, "verify");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setKnownPeer.calledWith({ ip: "178.165.55.55", port: 4002, version: "0.0.1" });
		verify.neverCalled();
	});

	it("#validateAndAcceptPeer - should skip peers that are already known, pending or active", async ({
		processor,
		repository,
	}) => {
		const setKnownPeer = spy(repository, "setKnownPeer");

		repository.hasKnownPeer = () => true;
		await processor.validateAndAcceptPeer("178.165.55.55");
		repository.hasKnownPeer = () => false;
		repository.hasPendingPeer = () => true;
		await processor.validateAndAcceptPeer("178.165.55.55");
		repository.hasPendingPeer = () => false;
		repository.hasPeer = () => true;
		await processor.validateAndAcceptPeer("178.165.55.55");

		setKnownPeer.neverCalled();
	});

	it("#validateAndAcceptPeer - should reject a banned address", async ({ processor, repository, peerDisposer }) => {
		peerDisposer.isBanned = () => true;
		const setKnownPeer = spy(repository, "setKnownPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setKnownPeer.neverCalled();
	});

	it("#validateAndAcceptPeer - should reject addresses the ip verifier refuses", async ({
		processor,
		repository,
		peerIpVerifier,
	}) => {
		peerIpVerifier.verify = () => CloseReason.Rejected;
		const setKnownPeer = spy(repository, "setKnownPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setKnownPeer.neverCalled();
	});

	it("#validateAndAcceptPeer - should not learn new peers in non-discovery mode", async ({
		processor,
		repository,
		configuration,
	}) => {
		configuration.getOptional = (key: string, defaultValue: unknown) =>
			key === "disableDiscovery" ? true : defaultValue;
		const setKnownPeer = spy(repository, "setKnownPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setKnownPeer.neverCalled();
	});

	it("#validateAndAcceptPeer - should still record seed peers in non-discovery mode", async ({
		processor,
		repository,
		seeds,
		configuration,
	}) => {
		configuration.getOptional = (key: string, defaultValue: unknown) =>
			key === "disableDiscovery" ? true : defaultValue;
		seeds.isSeed = () => true;
		const setKnownPeer = spy(repository, "setKnownPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setKnownPeer.calledOnce();
	});

	it("#onConnection - should bind the connection to a new peer, verify it and make it active", async ({
		websocketService,
		repository,
		events,
		peerDiscoverer,
	}) => {
		const setPendingPeer = spy(repository, "setPendingPeer");
		const setPeer = spy(repository, "setPeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const dispatch = spy(events, "dispatch");
		const discoverPeers = spy(peerDiscoverer, "discoverPeers");

		await connect(websocketService, "178.165.55.55");

		const peer = setPeer.getCallArgs(0)[0];
		assert.equal(peer.ip, "178.165.55.55");
		assert.equal(peer.connection.remoteAddress, "178.165.55.55");
		setPendingPeer.calledWith(peer);
		dispatch.calledWith(Events.PeerEvent.Added, peer);
		discoverPeers.calledWith(peer);
		forgetPendingPeer.calledWith(peer);
	});

	it("#onConnection - should reuse the known peer for the address", async ({ websocketService, repository }) => {
		const known = makePeer("178.165.55.55");
		repository.hasKnownPeer = () => true;
		repository.getKnownPeer = () => known;
		const forgetKnownPeer = spy(repository, "forgetKnownPeer");
		const setPeer = spy(repository, "setPeer");

		await connect(websocketService, "178.165.55.55");

		forgetKnownPeer.calledWith(known);
		setPeer.calledWith(known);
		assert.equal(known.connection.remoteAddress, "178.165.55.55");
	});

	it("#onConnection - should forget the pending peer and dispose it when accepting throws", async ({
		websocketService,
		repository,
		transactionPoolWorker,
		peerDisposer,
	}) => {
		transactionPoolWorker.setPeer = async () => {
			throw new Error("worker down");
		};
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const disposePeer = spy(peerDisposer, "disposePeer");

		await connect(websocketService, "178.165.55.55");

		forgetPendingPeer.calledOnce();
		disposePeer.calledWith("178.165.55.55");
	});

	it("#onConnection - should not activate a peer that got banned while it was being verified", async ({
		websocketService,
		repository,
		peerVerifier,
		peerDisposer,
		events,
	}) => {
		let banned = false;
		peerVerifier.verify = async () => {
			banned = true;
			return true;
		};
		peerDisposer.isBanned = () => banned;

		const setPeer = spy(repository, "setPeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const dispatch = spy(events, "dispatch");

		await connect(websocketService, "178.165.55.55");

		setPeer.neverCalled();
		dispatch.neverCalled();
		forgetPendingPeer.calledOnce();
	});

	it("#onConnection - should not activate a peer when verification fails", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		peerVerifier.verify = async () => false;
		const setPeer = spy(repository, "setPeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");

		await connect(websocketService, "178.165.55.55");

		setPeer.neverCalled();
		forgetPendingPeer.calledOnce();
	});

	it("#onConnection - should skip peers that are already active or pending", async ({
		websocketService,
		repository,
		peerVerifier,
	}) => {
		const verify = spy(peerVerifier, "verify");

		repository.hasPeer = () => true;
		await connect(websocketService, "178.165.55.55");
		repository.hasPeer = () => false;
		repository.hasPendingPeer = () => true;
		await connect(websocketService, "178.165.55.55");

		verify.neverCalled();
	});

	it("#onConnection - should dispose unknown peers in non-discovery mode but keep seeds", async ({
		websocketService,
		repository,
		peerDisposer,
		seeds,
		configuration,
	}) => {
		configuration.getOptional = (key: string, defaultValue: unknown) =>
			key === "disableDiscovery" ? true : defaultValue;
		const disposePeer = spy(peerDisposer, "disposePeer");
		const setPeer = spy(repository, "setPeer");

		await connect(websocketService, "178.165.55.55");
		disposePeer.calledWith("178.165.55.55");

		seeds.isSeed = (ip: string) => ip === "178.165.55.56";
		await connect(websocketService, "178.165.55.56");
		setPeer.calledOnce();
	});

	it("#onConnection - should re-check the address rules after verification", async ({
		websocketService,
		repository,
		peerVerifier,
		peerIpVerifier,
		peerDisposer,
		events,
	}) => {
		// Concurrent accepts from one /24 all pass the transport's check; the others land during this verification.
		peerVerifier.verify = async () => {
			peerIpVerifier.verify = () => CloseReason.Rejected;
			return true;
		};

		const setPeer = spy(repository, "setPeer");
		const disposePeer = spy(peerDisposer, "disposePeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const dispatch = spy(events, "dispatch");

		await connect(websocketService, "178.165.55.55");

		setPeer.neverCalled();
		dispatch.neverCalled();
		disposePeer.calledWith("178.165.55.55");
		forgetPendingPeer.calledOnce();
	});

	it("#onConnection - should dispose the peer when its connection closes", async ({
		websocketService,
		peerDisposer,
	}) => {
		let onClose!: () => void;
		const connection = { onClose: (listener: () => void) => (onClose = listener), remoteAddress: "178.165.55.55" };
		const disposePeer = spy(peerDisposer, "disposePeer");

		websocketService.onConnection(connection);
		await new Promise((resolve) => setImmediate(resolve));

		disposePeer.neverCalled();
		onClose();
		disposePeer.calledWith("178.165.55.55");
	});
});

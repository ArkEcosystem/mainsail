import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { PeerProcessor } from "./peer-processor";

describe<{
	processor: PeerProcessor;
	repository: any;
	peerVerifier: any;
	peerDisposer: any;
	txPoolNodeVerifier: any;
	events: any;
	logger: any;
	transactionPoolWorker: any;
	peerCommunicator: any;
	peerDiscoverer: any;
	apiNodeDiscoverer: any;
}>("PeerProcessor", ({ it, beforeEach, spy }) => {
	beforeEach((context) => {
		context.logger = { debug: () => {}, warn: () => {}, warnExtra: () => {} };
		context.repository = {
			forgetPendingPeer: () => {},
			getPeers: () => [],
			getSameSubnetPeers: () => [],
			hasPeer: () => false,
			hasPendingPeer: () => false,
			setPeer: () => {},
			setPendingPeer: () => {},
		};
		context.peerVerifier = { verify: async () => true };
		context.peerDisposer = { banPeer: () => {}, disposePeer: () => {}, isBanned: () => false };
		context.txPoolNodeVerifier = { verify: async () => true };
		context.events = { dispatch: async () => {}, listen: () => {} };
		context.transactionPoolWorker = { registerEventHandler: () => {}, setPeer: async () => {} };
		context.peerCommunicator = { pingPorts: async () => {} };
		context.peerDiscoverer = { discoverPeers: async () => {} };
		context.apiNodeDiscoverer = { discoverApiNodes: async () => {} };

		const configuration = {
			getOptional: (key: string, defaultValue: unknown) => defaultValue,
			getRequired: (key: string) => ({ blacklist: [], maxSameSubnetPeers: 5, whitelist: ["*"] })[key],
		};

		const app = new Application();
		app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue(configuration).whenTagged("plugin", "p2p");
		app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(context.repository);
		app.bind(Identifiers.P2P.Peer.Verifier).toConstantValue(context.peerVerifier);
		app.bind(Identifiers.P2P.Peer.Disposer).toConstantValue(context.peerDisposer);
		app.bind(Identifiers.P2P.Peer.Communicator).toConstantValue(context.peerCommunicator);
		app.bind(Identifiers.P2P.Peer.Discoverer).toConstantValue(context.peerDiscoverer);
		app.bind(Identifiers.P2P.ApiNode.Discoverer).toConstantValue(context.apiNodeDiscoverer);
		app.bind(Identifiers.P2P.Peer.Factory).toConstantValue((ip: string) => ({ ip, port: 4002, version: "0.0.1" }));
		app.bind(Identifiers.P2P.TxPoolNode.Factory).toConstantValue((ip: string) => ({ ip }));
		app.bind(Identifiers.P2P.TxPoolNode.Verifier).toConstantValue(context.txPoolNodeVerifier);
		app.bind(Identifiers.TransactionPool.Worker).toConstantValue(context.transactionPoolWorker);
		app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		app.bind(Identifiers.P2P.Logger).toConstantValue(context.logger);

		context.processor = app.resolve(PeerProcessor);
	});

	it("#validateAndAcceptPeer - should accept a new peer when verification succeeds", async ({
		processor,
		repository,
		events,
	}) => {
		const setPeer = spy(repository, "setPeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const dispatch = spy(events, "dispatch");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setPeer.calledOnce();
		dispatch.calledWith(Events.PeerEvent.Added, { ip: "178.165.55.55", port: 4002, version: "0.0.1" });
		forgetPendingPeer.calledOnce();
	});

	it("#validateAndAcceptPeer - should not accept a peer that got banned while its acceptance was being verified", async ({
		processor,
		repository,
		peerVerifier,
		peerDisposer,
		events,
	}) => {
		// The ban lands after the pre-verification isBanned check has already passed.
		let banned = false;
		peerVerifier.verify = async () => {
			banned = true;
			return true;
		};
		peerDisposer.isBanned = () => banned;

		const setPeer = spy(repository, "setPeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const dispatch = spy(events, "dispatch");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setPeer.neverCalled();
		dispatch.neverCalled();
		forgetPendingPeer.calledOnce();
	});

	it("#validateAndAcceptPeer - should not accept a peer when peer verification fails", async ({
		processor,
		repository,
		peerVerifier,
		txPoolNodeVerifier,
	}) => {
		peerVerifier.verify = async () => false;
		const txPoolVerify = spy(txPoolNodeVerifier, "verify");
		const setPeer = spy(repository, "setPeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setPeer.neverCalled();
		txPoolVerify.neverCalled();
		forgetPendingPeer.calledOnce();
	});

	it("#validateAndAcceptPeer - should not accept a peer when the tx pool node verification fails", async ({
		processor,
		repository,
		txPoolNodeVerifier,
	}) => {
		txPoolNodeVerifier.verify = async () => false;
		const setPeer = spy(repository, "setPeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setPeer.neverCalled();
		forgetPendingPeer.calledOnce();
	});

	it("#validateAndAcceptPeer - should skip peers that are already known", async ({
		processor,
		repository,
		peerVerifier,
	}) => {
		repository.hasPeer = () => true;
		const verify = spy(peerVerifier, "verify");
		const setPendingPeer = spy(repository, "setPendingPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		verify.neverCalled();
		setPendingPeer.neverCalled();
	});

	it("#validateAndAcceptPeer - should skip peers that are already pending", async ({
		processor,
		repository,
		peerVerifier,
	}) => {
		repository.hasPendingPeer = () => true;
		const verify = spy(peerVerifier, "verify");
		const setPendingPeer = spy(repository, "setPendingPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		verify.neverCalled();
		setPendingPeer.neverCalled();
	});

	it("#validateAndAcceptPeer - should reject a peer that is banned before verification starts", async ({
		processor,
		repository,
		peerVerifier,
		peerDisposer,
	}) => {
		peerDisposer.isBanned = () => true;
		const verify = spy(peerVerifier, "verify");
		const setPendingPeer = spy(repository, "setPendingPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		verify.neverCalled();
		setPendingPeer.neverCalled();
	});

	it("#validateAndAcceptPeer - should reject localhost addresses", async ({ processor, peerVerifier }) => {
		const verify = spy(peerVerifier, "verify");

		await processor.validateAndAcceptPeer("127.0.0.1");

		verify.neverCalled();
	});
});

import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { PeerProcessor } from "./peer-processor";

describe<{
	processor: PeerProcessor;
	repository: any;
	peerVerifier: any;
	peerDisposer: any;
	events: any;
	logger: any;
	transactionPoolWorker: any;
	peerDiscoverer: any;
	configuration: any;
}>("PeerProcessor", ({ it, assert, beforeEach, spy }) => {
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
		context.events = { dispatch: async () => {}, listen: () => {} };
		context.transactionPoolWorker = { registerEventHandler: () => {}, setPeer: async () => {} };
		context.peerDiscoverer = { discoverPeers: async () => {} };

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
		app.bind(Identifiers.P2P.Peer.Factory).toConstantValue((ip: string) => ({ ip, port: 4002, version: "0.0.1" }));
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

	it("#validateAndAcceptPeer - should forget the pending peer and dispose it when accepting throws", async ({
		processor,
		repository,
		transactionPoolWorker,
		peerDisposer,
	}) => {
		transactionPoolWorker.setPeer = async () => {
			throw new Error("worker down");
		};
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const disposePeer = spy(peerDisposer, "disposePeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		forgetPendingPeer.calledOnce();
		disposePeer.calledWith("178.165.55.55");
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
	}) => {
		peerVerifier.verify = async () => false;
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

	it("#validateAndAcceptPeer - should not learn new peers in non-discovery mode", async ({
		processor,
		repository,
		peerVerifier,
		configuration,
	}) => {
		configuration.getOptional = (key: string, defaultValue: unknown) =>
			key === "disableDiscovery" ? true : defaultValue;
		const verify = spy(peerVerifier, "verify");
		const setPendingPeer = spy(repository, "setPendingPeer");

		await processor.validateAndAcceptPeer("178.165.55.55");

		verify.neverCalled();
		setPendingPeer.neverCalled();
	});

	it("#validateAndAcceptPeer - should still accept seed peers in non-discovery mode", async ({
		processor,
		repository,
		configuration,
	}) => {
		configuration.getOptional = (key: string, defaultValue: unknown) =>
			key === "disableDiscovery" ? true : defaultValue;
		const setPeer = spy(repository, "setPeer");

		await processor.validateAndAcceptPeer("178.165.55.55", { seed: true });

		setPeer.calledOnce();
	});

	it("#validateAndAcceptPeer - should re-check the subnet cap after verification", async ({
		processor,
		repository,
		peerVerifier,
		peerDisposer,
		events,
	}) => {
		// Concurrent accepts from one /24 all pass validatePeerIp() while none of them is in the repository;
		// the others land while this one is being verified.
		const sameSubnetPeers: object[] = [];
		repository.getSameSubnetPeers = () => sameSubnetPeers;
		peerVerifier.verify = async () => {
			sameSubnetPeers.push(...Array.from({ length: 5 }, (_, index) => ({ ip: `178.165.55.${index}` })));
			return true;
		};

		const setPeer = spy(repository, "setPeer");
		const disposePeer = spy(peerDisposer, "disposePeer");
		const forgetPendingPeer = spy(repository, "forgetPendingPeer");
		const dispatch = spy(events, "dispatch");

		await processor.validateAndAcceptPeer("178.165.55.55");

		setPeer.neverCalled();
		dispatch.neverCalled();
		disposePeer.calledWith("178.165.55.55");
		forgetPendingPeer.calledOnce();
	});

	it("#validateAndAcceptPeer - should re-accept a disposed seed from an inbound request in non-discovery mode", async ({
		processor,
		repository,
		configuration,
	}) => {
		configuration.getOptional = (key: string, defaultValue: unknown) =>
			key === "disableDiscovery" ? true : defaultValue;
		const setPeer = spy(repository, "setPeer");

		await processor.validateAndAcceptPeer("178.165.55.55", { seed: true });
		setPeer.calledOnce();

		// The seed was disposed meanwhile (the repository no longer has it) and connects to us again:
		// the inbound accept carries no seed flag, and nothing else re-populates seeds (launchMode=seed).
		await processor.validateAndAcceptPeer("178.165.55.55");
		setPeer.calledTimes(2);
	});

	it("#validatePeerIp - should exempt a known seed from the subnet cap", async ({ processor, repository }) => {
		await processor.validateAndAcceptPeer("178.165.55.55", { seed: true });
		repository.getSameSubnetPeers = () => Array.from({ length: 5 }, (_, index) => ({ ip: `178.165.55.${index}` }));

		assert.true(processor.validatePeerIp("178.165.55.55"));
		assert.false(processor.validatePeerIp("178.165.55.56"));
	});

	it("#validatePeerIp - should not reject inbound requests in non-discovery mode", ({ processor, configuration }) => {
		configuration.getOptional = (key: string, defaultValue: unknown) =>
			key === "disableDiscovery" ? true : defaultValue;

		assert.true(processor.validatePeerIp("178.165.55.55"));
	});

	it("#validateAndAcceptPeer - should reject localhost addresses", async ({ processor, peerVerifier }) => {
		const verify = spy(peerVerifier, "verify");

		await processor.validateAndAcceptPeer("127.0.0.1");

		verify.neverCalled();
	});
});

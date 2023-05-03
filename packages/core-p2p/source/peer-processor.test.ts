import { Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Providers } from "@arkecosystem/core-kernel";
import { describe, Sandbox } from "../../core-test-framework";

import { defaults } from "./defaults";
import { Peer } from "./peer";
import { PeerProcessor } from "./peer-processor";

describe<{
	sandbox: Sandbox;
	peerProcessor: PeerProcessor;
	configuration: Providers.PluginConfiguration;
}>("PeerProcessor", ({ it, assert, beforeEach, stub }) => {
	const logger = { debug: () => {}, warning: () => {} };
	const peerCommunicator = { ping: () => {} };
	const peerConnector = { disconnect: () => {} };
	const peerRepository = {
		forgetPendingPeer: () => {},
		getSameSubnetPeers: () => {},
		hasPeer: () => {},
		hasPendingPeer: () => {},
		setPeer: () => {},
		setPendingPeer: () => {},
	};
	const eventDispatcher = { dispatch: () => {}, listen: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app
			.bind(Identifiers.PluginConfiguration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTargetTagged("plugin", "core-p2p");
		context.sandbox.app.resolve(Providers.PluginConfiguration).from("", defaults);
		context.sandbox.app.bind(Identifiers.PeerCommunicator).toConstantValue(peerCommunicator);
		context.sandbox.app.bind(Identifiers.PeerConnector).toConstantValue(peerConnector);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue(peerRepository);
		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(eventDispatcher);
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.PeerFactory).toFactory<Peer>(() => (ip: string) => new Peer(ip, 4002));

		context.configuration = context.sandbox.app.getTagged(Identifiers.PluginConfiguration, "plugin", "core-p2p");

		context.peerProcessor = context.sandbox.app.resolve(PeerProcessor);
	});

	it("#initialize - should add a listener to Enums.CryptoEvent.MilestoneChanged", ({ peerProcessor }) => {
		const spyEventDispatcherListen = stub(eventDispatcher, "listen");

		peerProcessor.initialize();

		spyEventDispatcherListen.calledOnce();
		spyEventDispatcherListen.calledWith(Enums.CryptoEvent.MilestoneChanged);
	});

	it("#validateAndAcceptPeer - should accept a new peer if its ip is validated", async ({ peerProcessor }) => {
		const peer = new Peer("178.165.55.55", 4000);

		stub(peerRepository, "getSameSubnetPeers").returnValueOnce([]);
		const spyPeerRepositorySetPendingPeer = stub(peerRepository, "setPendingPeer");
		const spyPeerRepositorySetPeer = stub(peerRepository, "setPeer");
		const spyPeerCommunicatorPing = stub(peerCommunicator, "ping");

		await peerProcessor.validateAndAcceptPeer(peer);

		spyPeerRepositorySetPendingPeer.calledOnce();
		spyPeerRepositorySetPeer.calledOnce();
		spyPeerCommunicatorPing.calledOnce();
	});

	it("#validateAndAcceptPeer - should disconnect the peer on any error", async ({ peerProcessor }) => {
		const peer = new Peer("178.165.55.55", 4000);

		stub(peerRepository, "getSameSubnetPeers").returnValueOnce([]);
		const spyPeerRepositorySetPendingPeer = stub(peerRepository, "setPendingPeer");
		const spyPeerRepositorySetPeer = stub(peerRepository, "setPeer");
		const spyPeerCommunicatorPing = stub(peerCommunicator, "ping").rejectedValue(new Error("ping threw"));
		const spyPeerConnectorDisconnect = stub(peerConnector, "disconnect");

		await peerProcessor.validateAndAcceptPeer(peer);

		spyPeerRepositorySetPendingPeer.calledOnce();
		spyPeerCommunicatorPing.calledOnce();
		spyPeerConnectorDisconnect.calledOnce();
		spyPeerRepositorySetPeer.neverCalled();
	});

	it("#validateAndAcceptPeer - should not do anything if peer is already added", async ({ peerProcessor }) => {
		const peer = new Peer("178.165.55.55", 4000);

		stub(peerRepository, "hasPeer").returnValueOnce(true);
		stub(peerRepository, "getSameSubnetPeers").returnValueOnce([]);
		const spyPeerRepositorySetPendingPeer = stub(peerRepository, "setPendingPeer");
		const spyPeerRepositorySetPeer = stub(peerRepository, "setPeer");
		const spyPeerCommunicatorPing = stub(peerCommunicator, "ping");

		await peerProcessor.validateAndAcceptPeer(peer);

		spyPeerRepositorySetPendingPeer.neverCalled();
		spyPeerRepositorySetPeer.neverCalled();
		spyPeerCommunicatorPing.neverCalled();
	});

	it("#validatePeerIp - should return false and log a warning when on disableDiscovery mode", ({
		peerProcessor,
		configuration,
	}) => {
		const peer = new Peer("178.165.55.55", 4000);

		const spyLoggerWarning = stub(logger, "warning");
		configuration.set("disableDiscovery", true);

		assert.false(peerProcessor.validatePeerIp(peer));
		spyLoggerWarning.calledOnce();
		spyLoggerWarning.calledWith(`Rejected ${peer.ip} because the relay is in non-discovery mode.`);

		configuration.set("disableDiscovery", false);
	});

	it("#validatePeerIp - should return false when peer is not valid", ({ peerProcessor }) => {
		const invalidPeer = new Peer("127.0.0.1", 4000); // localhost is invalid
		assert.false(peerProcessor.validatePeerIp(invalidPeer));
	});

	it("#validatePeerIp - should return false when peer is already in pending peers", ({ peerProcessor }) => {
		const peer = new Peer("178.165.55.55", 4000);
		stub(peerRepository, "hasPendingPeer").returnValue(true);

		assert.false(peerProcessor.validatePeerIp(peer));
	});

	it("#validatePeerIp - should return false when peer is not whitelisted", ({ peerProcessor, configuration }) => {
		const peer = new Peer("178.165.55.55", 4000);
		configuration.set("whitelist", ["127.0.0.1"]);

		assert.false(peerProcessor.validatePeerIp(peer));

		configuration.set("whitelist", ["*"]);
	});

	it("#validatePeerIp - should return false when peer is blacklisted", ({ peerProcessor, configuration }) => {
		const peer = new Peer("178.165.55.55", 4000);

		configuration.set("blacklist", ["178.165.55.55"]);

		assert.false(peerProcessor.validatePeerIp(peer));

		configuration.set("blacklist", []);
	});

	it("#validatePeerIp - should return false when there are already too many peers on the peer subnet and not in seed mode", ({
		peerProcessor,
		configuration,
	}) => {
		const peer = new Peer("178.165.55.55", 4000);
		const sameSubnetPeers = [new Peer("178.165.55.50", 4000), new Peer("178.165.55.51", 4000)];
		stub(peerRepository, "getSameSubnetPeers").returnValueOnce(sameSubnetPeers);

		configuration.set("maxSameSubnetPeers", 2);

		assert.false(peerProcessor.validatePeerIp(peer));

		configuration.set("maxSameSubnetPeers", 5);
	});

	it("#validatePeerIp - should return true otherwise", ({ peerProcessor }) => {
		const peer = new Peer("178.165.55.55", 4000);
		stub(peerRepository, "getSameSubnetPeers").returnValueOnce([]);

		assert.true(peerProcessor.validatePeerIp(peer));
	});
});

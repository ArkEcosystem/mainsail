import { Identifiers } from "@mainsail/contracts";
import { Enums, Providers, Utils } from "@mainsail/core-kernel";
import { describe, Sandbox } from "../../core-test-framework";
import { BigNumber } from "@mainsail/utils";
import importFresh from "import-fresh";
import path from "path";

import peerFixtures from "../test/fixtures/peers.json";
import { ChunkCache } from "./chunk-cache";
import { NetworkMonitor } from "./network-monitor";
import { NetworkState } from "./network-state";
import { Peer } from "./peer";
import { PeerVerificationResult } from "./peer-verifier";

describe<{
	sandbox: Sandbox;
	networkMonitor: NetworkMonitor;
	configuration: Providers.PluginConfiguration;
}>("NetworkMonitor", ({ it, assert, beforeEach, stub, spy, match, each }) => {
	const logger = { debug: () => {}, error: () => {}, info: () => {}, notice: () => {}, warning: () => {} };

	const emitter = { dispatch: () => {} };
	const communicator = {
		getPeerBlocks: () => {},
		getPeers: () => {},
		ping: () => {},
		pingPorts: () => {},
		postBlock: () => {},
	};
	const repository = { forgetPeer: () => {}, getPeers: () => [] };

	const triggerService = { call: () => {} }; // validateAndAcceptPeer
	const stateStore = { getLastBlock: () => {} };
	const blockchain = { getBlockPing: () => {}, getLastBlock: () => {} };
	const slots = { getSlotNumber: () => 0 };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app
			.bind(Identifiers.PluginConfiguration)
			.toConstantValue(new Providers.PluginConfiguration().from("", importFresh("./defaults").defaults))
			.whenTargetTagged("plugin", "core-p2p");
		context.sandbox.app.bind(Identifiers.ApplicationVersion).toConstantValue("0.0.1");
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.PeerChunkCache).to(ChunkCache).inSingletonScope();
		context.sandbox.app.bind(Identifiers.PeerNetworkMonitor).to(NetworkMonitor);
		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(emitter);
		context.sandbox.app.bind(Identifiers.PeerCommunicator).toConstantValue(communicator);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue(repository);
		context.sandbox.app.bind(Identifiers.TriggerService).toConstantValue(triggerService);
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(stateStore);
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
		context.sandbox.app.bind(Identifiers.Cryptography.Time.Slots).toConstantValue(slots);

		context.configuration = context.sandbox.app.getTagged(Identifiers.PluginConfiguration, "plugin", "core-p2p");
		context.networkMonitor = context.sandbox.app.resolve(NetworkMonitor);
	});

	// it("#boot - should populate peers from seed peers config by calling validateAndAcceptPeer, when peer discovery is disabled", async ({
	// 	networkMonitor,
	// 	sandbox,
	// 	configuration,
	// }) => {
	// 	configuration.set("skipDiscovery", true);

	// 	const peers = {
	// 		list: [
	// 			{ ip: "187.177.54.44", port: 4000 },
	// 			{ ip: "188.177.54.44", port: 4000 },
	// 			{ ip: "189.177.54.44", port: 4000 },
	// 		],
	// 	};

	// 	stub(sandbox.app, "config").returnValue(peers);
	// 	const spyTriggerServiceCall = spy(triggerService, "call");

	// 	await networkMonitor.boot();

	// 	spyTriggerServiceCall.calledTimes(peers.list.length);
	// 	for (let index = 0; index < peers.list.length; index++) {
	// 		spyTriggerServiceCall.calledNthWith(index++, "validateAndAcceptPeer", {
	// 			options: { lessVerbose: true, seed: true },
	// 			peer: match.instanceOf(Peer),
	// 		});
	// 	}
	// });

	// it("#boot - should populate peers from URL config by calling validateAndAcceptPeer, when peer discovery is disabled", async ({
	// 	sandbox,
	// 	networkMonitor,
	// 	configuration,
	// }) => {
	// 	configuration.set("skipDiscovery", true);

	// 	const peers = [
	// 		{ ip: "187.177.54.44", port: 4000 },
	// 		{ ip: "188.177.54.44", port: 4000 },
	// 		{ ip: "189.177.54.44", port: 4000 },
	// 		{ ip: "190.177.54.44", port: 4000 },
	// 		{ ip: "191.177.54.44", port: 4000 },
	// 	];

	// 	stub(sandbox.app, "config").returnValue({
	// 		list: [],
	// 		sources: ["http://peers.someurl.com"],
	// 	});
	// 	const spyTriggerServiceCall = spy(triggerService, "call");
	// 	stub(Utils.http, "get").resolvedValue({ data: peers });

	// 	await networkMonitor.boot();

	// 	spyTriggerServiceCall.calledTimes(peers.length);
	// 	for (let index = 0; index < peers.length; index++) {
	// 		spyTriggerServiceCall.calledNthWith(index++, "validateAndAcceptPeer", {
	// 			options: { lessVerbose: true, seed: true },
	// 			peer: match.instanceOf(Peer),
	// 		});
	// 	}
	// });

	// it("#boot - should populate peers from URL config by calling validateAndAcceptPeer, when body is string, when peer discovery is disabled", async ({
	// 	sandbox,
	// 	networkMonitor,
	// 	configuration,
	// }) => {
	// 	configuration.set("skipDiscovery", true);

	// 	const peers = [
	// 		{ ip: "187.177.54.44", port: 4000 },
	// 		{ ip: "188.177.54.44", port: 4000 },
	// 		{ ip: "189.177.54.44", port: 4000 },
	// 		{ ip: "190.177.54.44", port: 4000 },
	// 		{ ip: "191.177.54.44", port: 4000 },
	// 	];

	// 	stub(sandbox.app, "config").returnValue({
	// 		list: [],
	// 		sources: ["http://peers.someurl.com"],
	// 	});
	// 	const spyTriggerServiceCall = spy(triggerService, "call");
	// 	stub(Utils.http, "get").resolvedValue({ data: JSON.stringify(peers) });

	// 	await networkMonitor.boot();

	// 	spyTriggerServiceCall.calledTimes(peers.length);
	// 	for (let index = 0; index < peers.length; index++) {
	// 		spyTriggerServiceCall.calledNthWith(index++, "validateAndAcceptPeer", {
	// 			options: { lessVerbose: true, seed: true },
	// 			peer: match.instanceOf(Peer),
	// 		});
	// 	}
	// });

	// it("#boot -  should handle as empty array if appConfigPeers.sources is undefined, when peer discovery is disabled", async ({
	// 	sandbox,
	// 	networkMonitor,
	// 	configuration,
	// }) => {
	// 	configuration.set("skipDiscovery", true);

	// 	stub(sandbox.app, "config").returnValue({
	// 		list: [],
	// 	});
	// 	const spyTriggerServiceCall = spy(triggerService, "call");

	// 	await networkMonitor.boot();

	// 	spyTriggerServiceCall.calledTimes(0);
	// });

	// it("#boot - should populate peers from file by calling validateAndAcceptPeer, when peer discovery is disabled", async ({
	// 	sandbox,
	// 	networkMonitor,
	// 	configuration,
	// }) => {
	// 	configuration.set("skipDiscovery", true);

	// 	stub(sandbox.app, "config").returnValue({
	// 		list: [],
	// 		sources: [path.resolve(__dirname, "../test/fixtures/", "peers.json")],
	// 	});
	// 	const spyTriggerServiceCall = spy(triggerService, "call");

	// 	await networkMonitor.boot();

	// 	spyTriggerServiceCall.calledTimes(peerFixtures.length);
	// 	for (let index = 0; index < peerFixtures.length; index++) {
	// 		spyTriggerServiceCall.calledNthWith(index++, "validateAndAcceptPeer", {
	// 			options: { lessVerbose: true, seed: true },
	// 			peer: match.instanceOf(Peer),
	// 		});
	// 	}
	// });

	// // TODO: Stop test
	// it.skip("#boot - should discover peers from seed peers (calling updateNetworkStatus) and log the peers discovered by version, when peer discovery is enabled", async ({
	// 	networkMonitor,
	// 	sandbox,
	// 	configuration,
	// }) => {
	// 	const peers = [
	// 		{ ip: "187.177.54.44", port: 4000, version: "3.0.0" },
	// 		{ ip: "188.177.54.44", port: 4000, version: "3.0.0" },
	// 		{ ip: "189.177.54.44", port: 4000, version: "3.0.1" },
	// 		{ ip: "190.177.54.44", port: 4000, version: "3.0.2" },
	// 		{ ip: "191.177.54.44", port: 4000, version: "3.0.2" },
	// 	];
	// 	stub(repository, "getPeers").returnValue(peers);
	// 	stub(sandbox.app, "config").returnValue({
	// 		list: [],
	// 	});
	// 	const spyUpdateNetworkStatus = spy(networkMonitor, "updateNetworkStatus");
	// 	const spyLoggerInfo = spy(logger, "info");

	// 	await networkMonitor.boot();

	// 	spyUpdateNetworkStatus.calledOnce();
	// 	spyUpdateNetworkStatus.calledWith(true);

	// 	spyLoggerInfo.called();
	// 	spyLoggerInfo.calledWith("Discovered 2 peers with v3.0.0.");
	// 	spyLoggerInfo.calledWith("Discovered 1 peer with v3.0.1.");
	// 	spyLoggerInfo.calledWith("Discovered 2 peers with v3.0.2.");
	// });

	// it("#updateNetworkStatus - should not do anything, when process.env.NODE_ENV === 'test'", async ({
	// 	networkMonitor,
	// }) => {
	// 	process.env.CORE_ENV = "test";

	// 	const spyDiscoverPeers = spy(networkMonitor, "discoverPeers");

	// 	await networkMonitor.updateNetworkStatus();

	// 	spyDiscoverPeers.neverCalled();

	// 	delete process.env.CORE_ENV;
	// });

	// it.skip("#updateNetworkStatus - should set coldStart to true and discover peers", async ({
	// 	networkMonitor,
	// 	sandbox,
	// 	configuration,
	// }) => {
	// 	configuration.set("networkStart", true);
	// 	const spyDiscoverPeers = stub(networkMonitor, "discoverPeers").resolvedValue(false);
	// 	stub(sandbox.app, "config").returnValue({
	// 		list: [],
	// 	});

	// 	assert.false(networkMonitor.isColdStart());

	// 	await networkMonitor.updateNetworkStatus();

	// 	assert.true(networkMonitor.isColdStart());
	// 	spyDiscoverPeers.calledOnce();
	// });

	it("#updateNetworkStatus - should log a warning message and not discover peers, when in 'disable discovery' mode", async ({
		networkMonitor,
		configuration,
	}) => {
		configuration.set("disableDiscovery", true);

		const spyDiscoverPeers = spy(networkMonitor, "discoverPeers");
		const spyLoggerWarning = spy(logger, "warning");

		await networkMonitor.updateNetworkStatus();

		spyLoggerWarning.calledWith("Skipped peer discovery because the relay is in non-discovery mode.");
		spyDiscoverPeers.neverCalled();
	});

	it.skip("#updateNetworkStatus - should discover new peers from existing", async ({ networkMonitor, sandbox }) => {
		stub(sandbox.app, "config").returnValue({
			list: [],
		});

		const spyDiscoverPeers = spy(networkMonitor, "discoverPeers");

		await networkMonitor.updateNetworkStatus();

		spyDiscoverPeers.calledOnce();
	});

	it.skip("#updateNetworkStatus - should log an error when discovering new peers fails", async ({
		networkMonitor,
		sandbox,
	}) => {
		stub(sandbox.app, "config").returnValue({
			list: [],
		});

		const errorMessage = "failed discovering peers";
		const spyDiscoverPeers = stub(networkMonitor, "discoverPeers").rejectedValue(new Error(errorMessage));
		const spyLoggerErrror = stub(logger, "error");

		await networkMonitor.updateNetworkStatus();

		spyDiscoverPeers.calledOnce();
		spyLoggerErrror.calledOnce();
		spyLoggerErrror.calledWith(`Network Status: ${errorMessage}`);
	});

	it.skip("#updateNetworkStatus - should fall back to seed peers when after discovering we are below minimum peers", async ({
		networkMonitor,
		sandbox,
	}) => {
		stub(sandbox.app, "config").returnValue({
			list: [],
		});

		const spyLoggerInfo = stub(logger, "info");

		await networkMonitor.updateNetworkStatus();

		spyLoggerInfo.calledWith("Couldn't find enough peers. Falling back to seed peers.");
	});

	it.skip("#updateNetworkStatus - should not fall back to seed peers when config.ignoreMinimumNetworkReach, when we are below minimum peers", async ({
		configuration,
		networkMonitor,
		sandbox,
	}) => {
		configuration.set("ignoreMinimumNetworkReach", true);
		const spyLoggerInfo = stub(logger, "info");

		await networkMonitor.updateNetworkStatus();

		spyLoggerInfo.notCalledWith("Couldn't find enough peers. Falling back to seed peers.");
	});

	// TODO: Restore test
	// it.only("#updateNetworkStatus - should schedule the next updateNetworkStatus only once", async ({
	// 	networkMonitor,
	// 	sandbox,
	// }) => {
	// 	stub(sandbox.app, "config").returnValue({
	// 		list: [],
	// 	});

	// 	const sleeping = true;
	// 	const mockSleep = async () => {
	// 		while (sleeping) {
	// 			await delay(10);
	// 		}
	// 	};

	// 	const spySleep = stub(Utils, "sleep").callsFake(async () => {
	// 		console.log("TEST");
	// 	});

	// 	// repository.getPeers.mockReturnValue([]);

	// 	// let sleeping = true;
	// 	// const mockSleep = async () => {
	// 	// 	while (sleeping) {
	// 	// 		await delay(10);
	// 	// 	}
	// 	// };
	// 	// const spySleep = jest.spyOn(Utils, "sleep").mockImplementationOnce(mockSleep);
	// 	// await networkMonitor.updateNetworkStatus();

	// 	// expect(spySleep).toBeCalledTimes(1);

	// 	// await networkMonitor.updateNetworkStatus();
	// 	// expect(spySleep).toBeCalledTimes(1);

	// 	// sleeping = false;
	// 	// await delay(20); // give time to mockSleep to end and scheduleUpdateNetworkStatus to finish

	// 	// await networkMonitor.updateNetworkStatus();

	// 	// expect(spySleep).toBeCalledTimes(2); // because no more pending nextUpdateNetworkStatusScheduled
	// });

	it.skip("#cleansePeers - should ping every peer when the peers length is <= <peerCount>", async ({
		networkMonitor,
		configuration,
	}) => {
		const peers = [
			new Peer("187.177.54.44", 4000),
			new Peer("188.177.54.44", 4000),
			new Peer("189.177.54.44", 4000),
			new Peer("190.177.54.44", 4000),
			new Peer("191.177.54.44", 4000),
		];
		stub(repository, "getPeers").returnValue(peers);

		const spyCommunicatorPing = spy(communicator, "ping");

		await networkMonitor.cleansePeers({ peerCount: 5 });

		spyCommunicatorPing.calledTimes(peers.length);
		for (const peer of peers) {
			spyCommunicatorPing.calledWith(peer, configuration.getRequired("verifyTimeout"));
		}
	});

	it.skip("#cleansePeers - should ping a max of <peerCount> peers when the peers length is above <peerCount>", async ({
		networkMonitor,
	}) => {
		const peers = [
			new Peer("187.177.54.44", 4000),
			new Peer("188.177.54.44", 4000),
			new Peer("189.177.54.44", 4000),
			new Peer("190.177.54.44", 4000),
			new Peer("191.177.54.44", 4000),
		];
		stub(repository, "getPeers").returnValue(peers);

		const spyCommunicatorPing = spy(communicator, "ping");

		await networkMonitor.cleansePeers({ peerCount: 2 });

		spyCommunicatorPing.calledTimes(2);
	});

	it.skip("#cleansePeers - should dispatch 'p2p.internal.disconnectPeer', PeerEvent.Removed, and log the error when ping fails for a peer", async ({
		networkMonitor,
	}) => {
		const peers = [
			new Peer("187.177.54.44", 4000),
			new Peer("188.177.54.44", 4000),
			new Peer("189.177.54.44", 4000),
			new Peer("190.177.54.44", 4000),
			new Peer("191.177.54.44", 4000),
		];
		stub(repository, "getPeers").returnValue(peers);

		const spyCommunicatorPing = stub(communicator, "ping").rejectedValueNth(0, new Error("Timeout"));
		const spyEmitterDispatch = spy(emitter, "dispatch");

		await networkMonitor.cleansePeers({ peerCount: 5 });

		spyCommunicatorPing.calledTimes(peers.length);
		spyEmitterDispatch.calledTimes(2);
		spyEmitterDispatch.calledWith(Enums.PeerEvent.Disconnect, { peer: match.instanceOf(Peer) }); // TODO: Check consistency
		spyEmitterDispatch.calledWith(Enums.PeerEvent.Removed, match.instanceOf(Peer)); // TODO: Check consistency
	});

	it.skip("#cleansePeers - should log the responsive peers count and the median network height when initializing", async ({
		networkMonitor,
	}) => {
		const peers = [
			new Peer("187.177.54.44", 4000),
			new Peer("188.177.54.44", 4000),
			new Peer("189.177.54.44", 4000),
			new Peer("190.177.54.44", 4000),
			new Peer("191.177.54.44", 4000),
		];
		stub(repository, "getPeers").returnValue(peers);

		const spyCommunicatorPing = stub(communicator, "ping").rejectedValueNth(0, new Error("Timeout"));
		const spyLoggerInfo = spy(logger, "info");

		await networkMonitor.cleansePeers({ peerCount: 5 });

		spyCommunicatorPing.calledTimes(peers.length);
		spyLoggerInfo.calledWith("4 of 5 peers on the network are responsive");
		spyLoggerInfo.calledWith("Median Network Height: 0");
	});

	it("#discoverPeers - should get peers from 8 of our peers, and add them to our peers", async ({
		networkMonitor,
	}) => {
		const peers = [
			new Peer("180.177.54.4", 4000),
			new Peer("181.177.54.4", 4000),
			new Peer("182.177.54.4", 4000),
			new Peer("183.177.54.4", 4000),
			new Peer("184.177.54.4", 4000),
			new Peer("185.177.54.4", 4000),
			new Peer("186.177.54.4", 4000),
			new Peer("187.177.54.4", 4000),
			new Peer("188.177.54.4", 4000),
			new Peer("189.177.54.4", 4000),
		];
		stub(repository, "getPeers").returnValue(peers);

		const spyTriggerServiceCall = spy(triggerService, "call");
		const spyCommunicatorGetPeers = stub(communicator, "getPeers").rejectedValueNth(0, new Error("Timeout"));

		// mocking a timeout for the first peer, should be fine
		// mocking different getPeers return for the other peers in storage
		for (let index = 1, peer = peers[1]; index < peers.length; index++, peer = peers[index]) {
			spyCommunicatorGetPeers.resolvedValueNth(index, [
				{ ip: `${peer.ip}1${index}`, port: peer.port },
				{ ip: `${peer.ip}2${index}`, port: peer.port },
				{ ip: `${peer.ip}3${index}`, port: peer.port },
				{ ip: `${peer.ip}4${index}`, port: peer.port },
			]);
		}

		await networkMonitor.discoverPeers();

		spyCommunicatorGetPeers.calledTimes(8);
		spyTriggerServiceCall.calledTimes(7 * 4); // validateAndAcceptPeer for each peer fetched from the 7 peers
	});

	it("#discoverPeers - should not add the peers fetched, when not in pingAll mode + we have more than minimum peers + we have more than 75% of the peers fetched", async ({
		networkMonitor,
		configuration,
	}) => {
		configuration.set("minimumNetworkReach", 5);

		const peers = [
			new Peer("180.177.54.4", 4000),
			new Peer("181.177.54.4", 4000),
			new Peer("182.177.54.4", 4000),
			new Peer("183.177.54.4", 4000),
			new Peer("184.177.54.4", 4000),
			new Peer("185.177.54.4", 4000),
			new Peer("186.177.54.4", 4000),
			new Peer("187.177.54.4", 4000),
			new Peer("188.177.54.4", 4000),
			new Peer("189.177.54.4", 4000),
		];
		stub(repository, "getPeers").returnValue(peers);

		const spyTriggerServiceCall = spy(triggerService, "call");
		const spyCommunicatorGetPeers = stub(communicator, "getPeers");
		// mocking different getPeers return for each peer in storage
		for (let index = 0, peer = peers[0]; index < peers.length; index++, peer = peers[index]) {
			spyCommunicatorGetPeers.rejectedValueNth(1, [{ ip: `${peer.ip}1${index}`, port: peer.port }]);
		}

		await networkMonitor.discoverPeers();

		spyCommunicatorGetPeers.calledTimes(8);
		spyTriggerServiceCall.neverCalled();
	});

	it.skip("#completeColdStart - should set coldStart to false", async ({
		networkMonitor,
		sandbox,
		configuration,
	}) => {
		configuration.set("networkStart", true);
		stub(sandbox.app, "config").returnValue({
			list: [],
		});

		await networkMonitor.updateNetworkStatus(); // setting cold start to true

		assert.true(networkMonitor.isColdStart());

		networkMonitor.completeColdStart();

		assert.false(networkMonitor.isColdStart());
	});

	it("#getNetworkState - should call cleansePeers with {fast, forcePing} and return network state from NetworkState.analyze", async ({
		networkMonitor,
	}) => {
		process.env.CORE_ENV = "test"; // for NetworkState analyze

		const block = {
			data: {
				blockSignature:
					"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
				generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
				height: 2,
				id: "17882607875259085966",
				numberOfTransactions: 0,
				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				payloadLength: 0,
				previousBlock: "17184958558311101492",
				reward: BigNumber.make("0"),
				timestamp: 46_583_330,
				totalAmount: BigNumber.make("0"),
				totalFee: BigNumber.make("0"),
				version: 0,
			},
			transactions: [],
		};

		stub(blockchain, "getLastBlock").returnValueOnce(block);
		const spyCleansePeers = spy(networkMonitor, "cleansePeers");

		const networkState = await networkMonitor.getNetworkState();

		assert.instance(networkState, NetworkState);
		spyCleansePeers.calledOnce();
		spyCleansePeers.calledWith({ fast: true, forcePing: true });

		delete process.env.CORE_ENV;
	});

	it.skip("#refreshPeersAfterFork - should call cleansePeers with {forcePing}", async ({ networkMonitor }) => {
		const spyCleansePeers = spy(networkMonitor, "cleansePeers");

		await networkMonitor.refreshPeersAfterFork();

		spyCleansePeers.calledOnce();
		spyCleansePeers.calledWith({ forcePing: true });
	});

	it.skip("#checkNetworkHealth - should not rollback when there are no verified peers", async ({
		networkMonitor,
	}) => {
		const peers = [
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
		];

		stub(repository, "getPeers").returnValue(peers);

		const networkStatus = await networkMonitor.checkNetworkHealth();

		assert.equal(networkStatus, { forked: false });
	});

	it.skip("#checkNetworkHealth - should rollback ignoring peers who are below common height", async ({
		networkMonitor,
	}) => {
		//                      105 (4 peers)
		//                     /
		// 90 (3 peers) ... 100 ... 103 (2 peers and us)

		const lastBlock = { data: { height: 103 } };

		const peers = [
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
		];

		stub(repository, "getPeers").returnValue(peers);
		stub(stateStore, "getLastBlock").returnValue(lastBlock);

		peers[0].verificationResult = new PeerVerificationResult(103, 90, 90);
		peers[1].verificationResult = new PeerVerificationResult(103, 90, 90);
		peers[2].verificationResult = new PeerVerificationResult(103, 90, 90);

		peers[3].verificationResult = new PeerVerificationResult(103, 105, 100);
		peers[4].verificationResult = new PeerVerificationResult(103, 105, 100);
		peers[5].verificationResult = new PeerVerificationResult(103, 105, 100);
		peers[6].verificationResult = new PeerVerificationResult(103, 105, 100);

		peers[7].verificationResult = new PeerVerificationResult(103, 103, 103);
		peers[8].verificationResult = new PeerVerificationResult(103, 103, 103);

		const networkStatus = await networkMonitor.checkNetworkHealth();

		assert.equal(networkStatus, { blocksToRollback: 3, forked: true });
	});

	it.skip("#checkNetworkHealth - should rollback ignoring peers who are at common height", async ({
		networkMonitor,
	}) => {
		//     105 (4 peers)
		//    /
		// 100 (3 peers) ... 103 (2 peers and us)

		const lastBlock = { data: { height: 103 } };

		const peers = [
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
		];

		stub(repository, "getPeers").returnValue(peers);
		stub(stateStore, "getLastBlock").returnValue(lastBlock);

		peers[0].verificationResult = new PeerVerificationResult(103, 100, 100);
		peers[1].verificationResult = new PeerVerificationResult(103, 100, 100);
		peers[2].verificationResult = new PeerVerificationResult(103, 100, 100);

		peers[3].verificationResult = new PeerVerificationResult(103, 105, 100);
		peers[4].verificationResult = new PeerVerificationResult(103, 105, 100);
		peers[5].verificationResult = new PeerVerificationResult(103, 105, 100);
		peers[6].verificationResult = new PeerVerificationResult(103, 105, 100);

		peers[7].verificationResult = new PeerVerificationResult(103, 103, 103);
		peers[8].verificationResult = new PeerVerificationResult(103, 103, 103);

		const networkStatus = await networkMonitor.checkNetworkHealth();

		assert.equal(networkStatus, { blocksToRollback: 3, forked: true });
	});

	it.skip("#checkNetworkHealth - should not rollback although most peers are forked", async ({ networkMonitor }) => {
		//    47 (1 peer)    47 (3 peers)   47 (3 peers)
		//   /              /              /
		// 12 ........... 31 ........... 35 ... 43 (3 peers and us)

		const lastBlock = { data: { height: 103 } };

		const peers = [
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
			new Peer("180.177.54.4", 4000),
		];

		stub(repository, "getPeers").returnValue(peers);
		stub(stateStore, "getLastBlock").returnValue(lastBlock);

		peers[0].verificationResult = new PeerVerificationResult(43, 47, 12);

		peers[1].verificationResult = new PeerVerificationResult(43, 47, 31);
		peers[2].verificationResult = new PeerVerificationResult(43, 47, 31);
		peers[3].verificationResult = new PeerVerificationResult(43, 47, 31);

		peers[4].verificationResult = new PeerVerificationResult(43, 47, 35);
		peers[5].verificationResult = new PeerVerificationResult(43, 47, 35);
		peers[6].verificationResult = new PeerVerificationResult(43, 47, 35);

		peers[7].verificationResult = new PeerVerificationResult(43, 47, 43);
		peers[8].verificationResult = new PeerVerificationResult(43, 47, 43);
		peers[9].verificationResult = new PeerVerificationResult(43, 47, 43);

		const networkStatus = await networkMonitor.checkNetworkHealth();

		assert.equal(networkStatus, { forked: false });
	});

	it("#downloadBlocksFromHeight - should return empty array and log an error when we have zero peer", async ({
		networkMonitor,
	}) => {
		const spyLoggerErrror = spy(logger, "error");

		const blocks = await networkMonitor.downloadBlocksFromHeight(1);

		assert.equal(blocks, []);
		spyLoggerErrror.calledOnce();
		spyLoggerErrror.calledWith("Could not download blocks: we have 0 peers");
	});

	it("#downloadBlocksFromHeight - should return empty array and log an error when all our peers are forked", async ({
		networkMonitor,
	}) => {
		const maxParallelDownloads = 25;

		const peer = new Peer("1.1.1.1", 4000);
		peer.state = { currentSlot: 4, forgingAllowed: true, header: {}, height: 4 };
		peer.verificationResult = new PeerVerificationResult(3, 4, 2);
		stub(repository, "getPeers").returnValue([peer]);

		const spyLoggerErrror = spy(logger, "error");

		const blocks = await networkMonitor.downloadBlocksFromHeight(1, maxParallelDownloads);

		assert.equal(blocks, []);
		spyLoggerErrror.calledOnce();
		spyLoggerErrror.calledWith(
			"Could not download blocks: We have 1 peer(s) but all of them are on a different chain than us",
		);
	});

	it("#downloadBlocksFromHeight - should download blocks from 1 peer", async ({ networkMonitor }) => {
		const mockBlock = { id: "123456" };
		const maxParallelDownloads = 25;

		stub(communicator, "getPeerBlocks").returnValue([mockBlock]);

		const peer = new Peer("1.1.1.1", 4000);
		peer.state = { currentSlot: 2, forgingAllowed: true, header: {}, height: 2 };
		peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };
		stub(repository, "getPeers").returnValue([peer]);

		const blocks = await networkMonitor.downloadBlocksFromHeight(1, maxParallelDownloads);

		assert.equal(blocks, [mockBlock]);
	});

	it("#downloadBlocksFromHeight - should download blocks from 1 peer - peer returns zero blocks", async ({
		networkMonitor,
	}) => {
		const maxParallelDownloads = 25;
		stub(communicator, "getPeerBlocks").returnValue([]);

		const peer = new Peer("1.1.1.1", 4000);
		peer.state = { currentSlot: 2, forgingAllowed: true, header: {}, height: 2 };
		peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };
		stub(repository, "getPeers").returnValue([peer]);

		const blocks = await networkMonitor.downloadBlocksFromHeight(1, maxParallelDownloads);

		assert.equal(blocks, []);
	});

	it("#downloadBlocksFromHeight - should download blocks in parallel from N peers max", async ({
		networkMonitor,
	}) => {
		const maxParallelDownloads = 25;
		const downloadChunkSize = 400;
		const baseHeight = 50_000;

		const expectedBlocksFromHeight = (height) => {
			const blocks = [];
			for (let index = 0; index < maxParallelDownloads * downloadChunkSize; index++) {
				blocks.push({ height: height + 1 + index });
			}
			return blocks;
		};

		const mockedGetPeerBlocks = (peer, { fromBlockHeight }) => {
			if (fromBlockHeight + 1 === baseHeight) {
				throw new Error(`Cannot download blocks, deliberate error`);
			}

			return expectedBlocksFromHeight(fromBlockHeight).slice(0, downloadChunkSize);
		};

		stub(communicator, "getPeerBlocks").callsFake(mockedGetPeerBlocks);

		const peers = [];
		for (let index = 0; index < maxParallelDownloads + 5; index++) {
			const peer = new Peer(`1.1.1.${index}`, 4000);
			peer.state = { currentSlot: 2, forgingAllowed: true, header: {}, height: 12_500 };
			peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };

			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const fromHeight = 1;

		const downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);
		const expectedBlocks = expectedBlocksFromHeight(fromHeight);

		assert.equal(downloadedBlocks, expectedBlocks);
	});

	it("#downloadBlocksFromHeight - should download blocks in parallel from all peers if less than N peers", async ({
		networkMonitor,
	}) => {
		const maxParallelDownloads = 25;
		const downloadChunkSize = 400;
		const baseHeight = 50_000;

		const expectedBlocksFromHeight = (height) => {
			const blocks = [];
			for (let index = 0; index < maxParallelDownloads * downloadChunkSize; index++) {
				blocks.push({ height: height + 1 + index });
			}
			return blocks;
		};

		const mockedGetPeerBlocks = (peer, { fromBlockHeight }) => {
			if (fromBlockHeight + 1 === baseHeight) {
				throw new Error(`Cannot download blocks, deliberate error`);
			}

			return expectedBlocksFromHeight(fromBlockHeight).slice(0, downloadChunkSize);
		};

		stub(communicator, "getPeerBlocks").callsFake(mockedGetPeerBlocks);

		const numberPeers = maxParallelDownloads - 7;

		const peers = [];
		for (let index = 0; index < numberPeers; index++) {
			const peer = new Peer(`1.1.1.${index}`, 4000);
			peer.state = { currentSlot: 2, forgingAllowed: true, header: {}, height: 12_500 };
			peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };

			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const fromHeight = 1;

		const downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);
		const expectedBlocks = expectedBlocksFromHeight(fromHeight).slice(0, numberPeers * downloadChunkSize);

		assert.equal(downloadedBlocks, expectedBlocks);
	});

	it("#downloadBlocksFromHeight - should handle when getPeerBlocks throws", async ({ networkMonitor }) => {
		const maxParallelDownloads = 25;
		const downloadChunkSize = 400;
		const baseHeight = 50_000;

		const expectedBlocksFromHeight = (height) => {
			const blocks = [];
			for (let index = 0; index < maxParallelDownloads * downloadChunkSize; index++) {
				blocks.push({ height: height + 1 + index });
			}
			return blocks;
		};

		const mockedGetPeerBlocks = (peer, { fromBlockHeight }) => {
			if (fromBlockHeight + 1 === baseHeight) {
				throw new Error(`Cannot download blocks, deliberate error`);
			}

			return expectedBlocksFromHeight(fromBlockHeight).slice(0, downloadChunkSize);
		};

		const spyCommunicatorGetPeerBlocks = stub(communicator, "getPeerBlocks").callsFake(mockedGetPeerBlocks);

		const numberPeers = 5;

		const peers = [];
		for (let index = 0; index < numberPeers; index++) {
			const peer = new Peer(`1.1.1.${index}`, 4000);
			peer.state = {
				currentSlot: 2,
				forgingAllowed: true,
				header: {},
				height: baseHeight + numberPeers * downloadChunkSize,
			};
			peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };

			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const chunksToDownloadBeforeThrow = 2;
		let fromHeight = baseHeight - 1 - chunksToDownloadBeforeThrow * downloadChunkSize;

		let downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);
		let expectedBlocks = expectedBlocksFromHeight(fromHeight).slice(
			0,
			chunksToDownloadBeforeThrow * downloadChunkSize,
		);

		assert.equal(downloadedBlocks, expectedBlocks);

		// when downloading the chunk triggering the throw, it will try to download from all the other peers
		// (so it will try (numPeers - 1) more times)
		spyCommunicatorGetPeerBlocks.calledTimes(numberPeers + (numberPeers - 1));

		for (let index = 0; index < numberPeers; index++) {
			if (index >= chunksToDownloadBeforeThrow && index < chunksToDownloadBeforeThrow + numberPeers) {
				spyCommunicatorGetPeerBlocks.calledNthWith(
					index,
					match.any,
					match.has("fromBlockHeight", fromHeight + chunksToDownloadBeforeThrow * downloadChunkSize),
				);
			} else {
				spyCommunicatorGetPeerBlocks.calledNthWith(
					index,
					match.any,
					match.has("fromBlockHeight", fromHeight + index * downloadChunkSize),
				);
			}
		}

		// See that the downloaded higher 2 chunks would be returned from the cache.
		spyCommunicatorGetPeerBlocks.reset();

		fromHeight = baseHeight - 1 + downloadChunkSize;

		downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);
		expectedBlocks = expectedBlocksFromHeight(fromHeight).slice(0, numberPeers * downloadChunkSize);

		assert.equal(downloadedBlocks, expectedBlocks);

		const numberFailedChunks = 1;
		const numberCachedChunks = numberPeers - chunksToDownloadBeforeThrow - numberFailedChunks;

		spyCommunicatorGetPeerBlocks.calledTimes(numberPeers - numberCachedChunks);

		for (let index = 0; index < numberPeers - numberCachedChunks; index++) {
			spyCommunicatorGetPeerBlocks.calledNthWith(
				index,
				match.any,
				match.has("fromBlockHeight", fromHeight + (index + numberCachedChunks) * downloadChunkSize),
			);
		}
	});

	it("#downloadBlocksFromHeight - should handle when getPeerBlocks always throws", async ({ networkMonitor }) => {
		const maxParallelDownloads = 25;
		const downloadChunkSize = 400;
		stub(communicator, "getPeerBlocks").rejectedValue("always throwing");

		const numberPeers = 5;
		const baseHeight = 10_000;

		const peers = [];
		for (let index = 0; index < numberPeers; index++) {
			const peer = new Peer(`1.1.1.${index}`, 4000);
			peer.state = {
				currentSlot: 2,
				forgingAllowed: true,
				header: {},
				height: baseHeight + numberPeers * downloadChunkSize,
			};
			peer.verificationResult = { forked: false, highestCommonHeight: 2, hisHeight: 2, myHeight: 2 };

			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const chunksToDownload = 2;
		const fromHeight = baseHeight - 1 - chunksToDownload * downloadChunkSize;

		const downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);

		assert.equal(downloadedBlocks, []);
	});

	it("#downloadBlocksFromHeight - should still download blocks from 1 peer if network height === our height", async ({
		networkMonitor,
	}) => {
		const maxParallelDownloads = 25;
		const mockBlock = { id: "123456" };

		stub(communicator, "getPeerBlocks").returnValue([mockBlock]);

		const peer = new Peer("1.1.1.1", 4000);
		peer.state = { currentSlot: 2, forgingAllowed: true, header: {}, height: 20 };
		peer.verificationResult = { forked: false, highestCommonHeight: 20, hisHeight: 20, myHeight: 20 };
		stub(repository, "getPeers").returnValue([peer]);

		assert.equal(await networkMonitor.downloadBlocksFromHeight(20, maxParallelDownloads), [mockBlock]);
	});

	it("#downloadBlocksFromHeight - should reduce download block chunk size after receiving no block", async ({
		sandbox,
		networkMonitor,
	}) => {
		const maxParallelDownloads = 25;
		const downloadChunkSize = 400;

		const chunkCache = sandbox.app.get<ChunkCache>(Identifiers.PeerChunkCache);
		// chunkCache.has = jest.fn().mockReturnValue(false);
		stub(chunkCache, "has").returnValue(false);

		const spyCommunicatorGetPeerBlocks = stub(communicator, "getPeerBlocks").returnValue([]);

		// communicator.getPeerBlocks = jest.fn().mockReturnValue([]);

		const numberPeers = maxParallelDownloads;
		const peers = [];
		for (let index = 0; index < maxParallelDownloads; index++) {
			const peer = new Peer(`1.1.1.${index}`, 4000);
			peer.state = { currentSlot: 1, forgingAllowed: true, header: {}, height: 1 };
			peer.state = {
				currentSlot: 2,
				forgingAllowed: true,
				header: {},
				height: numberPeers * downloadChunkSize,
			};
			peer.verificationResult = { forked: false, highestCommonHeight: 1, hisHeight: 1, myHeight: 1 };
			peers.push(peer);
		}
		stub(repository, "getPeers").returnValue(peers);

		const fromHeight = 1;

		// first step, peers won't return any block: chunk size should be reduced by factor 10 for next download
		for (const expectedBlockLimit of [400, 40, 4, 1, 1, 1]) {
			spyCommunicatorGetPeerBlocks.reset();
			const downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);

			assert.equal(downloadedBlocks, []);
			// getPeerBlocks fails every time for every peer, so it will try for each peer
			// from all the other peers before reducing chunk size
			spyCommunicatorGetPeerBlocks.calledTimes(601); // TODO: Should be numPeers * maxParallelDownloads

			spyCommunicatorGetPeerBlocks.calledWith(match.any, {
				blockLimit: expectedBlockLimit,
				fromBlockHeight: match.number,
			});
		}

		const baseHeight = 50_000;

		const expectedBlocksFromHeight = (height) => {
			const blocks = [];
			for (let index = 0; index < maxParallelDownloads * downloadChunkSize; index++) {
				blocks.push({ height: height + 1 + index });
			}
			return blocks;
		};

		const mockedGetPeerBlocks = (peer, { fromBlockHeight }) => {
			if (fromBlockHeight + 1 === baseHeight) {
				throw new Error(`Cannot download blocks, deliberate error`);
			}

			return expectedBlocksFromHeight(fromBlockHeight).slice(0, downloadChunkSize);
		};

		spyCommunicatorGetPeerBlocks.callsFake((_, { fromBlockHeight }) => [
			expectedBlocksFromHeight(fromBlockHeight)[0],
		]);

		// second step, peers return blocks: chunk size should be reset to default value (400) for next download
		const mockGetPeerBlocks1Block = (_, { fromBlockHeight }) => [expectedBlocksFromHeight(fromBlockHeight)[0]];
		for (const expectedBlockLimit of [1, 400]) {
			spyCommunicatorGetPeerBlocks.callsFake(
				expectedBlockLimit === 1 ? mockGetPeerBlocks1Block : mockedGetPeerBlocks,
			);

			const downloadedBlocks = await networkMonitor.downloadBlocksFromHeight(fromHeight, maxParallelDownloads);

			const expectedBlocks = expectedBlocksFromHeight(fromHeight).slice(0, numberPeers * expectedBlockLimit);

			assert.equal(downloadedBlocks, expectedBlocks);

			// spyCommunicatorGetPeerBlocks.calledTimes(maxParallelDownloads); // TODO: Check

			spyCommunicatorGetPeerBlocks.calledWith(match.any, {
				blockLimit: expectedBlockLimit,
				fromBlockHeight: match.number,
			});
		}
	});

	each(
		"#broadcastBlock - should not broadcast to any peer when blockPing >= 4",
		async ({ context, dataset }) => {
			const count = dataset;

			const block = {
				data: {
					blockSignature:
						"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
					generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
					height: 2,
					id: "17882607875259085966",
					numberOfTransactions: 0,
					payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
					payloadLength: 0,
					previousBlock: "17184958558311101492",
					reward: BigNumber.make("0"),
					timestamp: 46_583_330,
					totalAmount: BigNumber.make("0"),
					totalFee: BigNumber.make("0"),
					version: 0,
				},
				transactions: [],
			};

			const peers = [
				new Peer("180.177.54.4", 4000),
				new Peer("181.177.54.4", 4000),
				new Peer("182.177.54.4", 4000),
				new Peer("183.177.54.4", 4000),
				new Peer("184.177.54.4", 4000),
			];
			stub(repository, "getPeers").returnValue(peers);

			stub(blockchain, "getBlockPing").returnValueOnce({
				block: block.data,
				count,
				first: 10_200,
				last: 10_900,
			});
			const spyCommunicatorPostBlock = spy(communicator, "postBlock");

			await context.networkMonitor.broadcastBlock(block);

			spyCommunicatorPostBlock.neverCalled();
		},
		[4, 5, 10, 50],
	);

	each(
		"#broadcastBlock - should broadcast to (4 - blockPing)/4 of our peers when blockPing < 4",
		async ({ context, dataset }) => {
			const count = dataset;

			const block = {
				data: {
					blockSignature:
						"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
					generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
					height: 2,
					id: "17882607875259085966",
					numberOfTransactions: 0,
					payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
					payloadLength: 0,
					previousBlock: "17184958558311101492",
					reward: BigNumber.make("0"),
					timestamp: 46_583_330,
					totalAmount: BigNumber.make("0"),
					totalFee: BigNumber.make("0"),
					version: 0,
				},
				transactions: [],
			};

			const peers = [
				new Peer("180.177.54.4", 4000),
				new Peer("181.177.54.4", 4000),
				new Peer("182.177.54.4", 4000),
				new Peer("183.177.54.4", 4000),
				new Peer("184.177.54.4", 4000),
			];
			stub(repository, "getPeers").returnValue(peers);

			stub(blockchain, "getBlockPing").returnValueOnce({
				block: block.data,
				count,
				first: 10_200,
				last: 10_900,
			});
			const spyCommunicatorPostBlock = spy(communicator, "postBlock");

			await context.networkMonitor.broadcastBlock(block);

			spyCommunicatorPostBlock.calledTimes(Math.ceil((peers.length * (4 - count)) / 4));
		},
		[0, 1, 2, 3],
	);

	each(
		"#broadcastBlock - should broadcast to all of our peers when block.id doesnt match blockPing.id",
		async ({ context, dataset }) => {
			const count = dataset;

			const block = {
				data: {
					blockSignature:
						"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
					generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
					height: 2,
					id: "17882607875259085966",
					numberOfTransactions: 0,
					payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
					payloadLength: 0,
					previousBlock: "17184958558311101492",
					reward: BigNumber.make("0"),
					timestamp: 46_583_330,
					totalAmount: BigNumber.make("0"),
					totalFee: BigNumber.make("0"),
					version: 0,
				},
				transactions: [],
			};

			const temporaryBlock = Utils.cloneDeep(block);

			temporaryBlock.data.id = "random_id";

			const peers = [
				new Peer("180.177.54.4", 4000),
				new Peer("181.177.54.4", 4000),
				new Peer("182.177.54.4", 4000),
				new Peer("183.177.54.4", 4000),
				new Peer("184.177.54.4", 4000),
			];
			stub(repository, "getPeers").returnValue(peers);

			stub(blockchain, "getBlockPing").returnValueOnce({
				block: temporaryBlock.data,
				count,
				first: 10_200,
				last: 10_900,
			});
			const spyCommunicatorPostBlock = spy(communicator, "postBlock");

			await context.networkMonitor.broadcastBlock(block);

			spyCommunicatorPostBlock.calledTimes(peers.length);
		},
		[0, 1, 2, 3],
	);

	it("#broadcastBlock - should not wait if block is from forger, when blockPing.last - blockPing.first < 500ms", async ({
		networkMonitor,
	}) => {
		const block = {
			data: {
				blockSignature:
					"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
				generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
				height: 2,
				id: "17882607875259085966",
				numberOfTransactions: 0,
				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				payloadLength: 0,
				previousBlock: "17184958558311101492",
				reward: BigNumber.make("0"),
				timestamp: 46_583_330,
				totalAmount: BigNumber.make("0"),
				totalFee: BigNumber.make("0"),
				version: 0,
			},
			transactions: [],
		};

		const peers = [
			new Peer("180.177.54.4", 4000),
			new Peer("181.177.54.4", 4000),
			new Peer("182.177.54.4", 4000),
			new Peer("183.177.54.4", 4000),
			new Peer("184.177.54.4", 4000),
		];
		stub(repository, "getPeers").returnValue(peers);

		stub(blockchain, "getBlockPing").returnValue({
			block: block.data,
			count: 2,
			first: 10_200,
			fromForger: true,
			last: 10_500,
		});
		const spyCommunicatorPostBlock = spy(communicator, "postBlock");
		// const spySleep = stub(Utils, "sleep"); // TODO: Test sleep

		await networkMonitor.broadcastBlock(block);

		spyCommunicatorPostBlock.calledTimes(peers.length);
		// spySleep.neverCalled();
	});

	it("#broadcastBlock - should wait until 500ms have elapsed between blockPing.last and blockPing.first before broadcasting, when blockPing.last - blockPing.first < 500ms", async ({
		networkMonitor,
	}) => {
		const block = {
			data: {
				blockSignature:
					"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
				generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
				height: 2,
				id: "17882607875259085966",
				numberOfTransactions: 0,
				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				payloadLength: 0,
				previousBlock: "17184958558311101492",
				reward: BigNumber.make("0"),
				timestamp: 46_583_330,
				totalAmount: BigNumber.make("0"),
				totalFee: BigNumber.make("0"),
				version: 0,
			},
			transactions: [],
		};

		const peers = [
			new Peer("180.177.54.4", 4000),
			new Peer("181.177.54.4", 4000),
			new Peer("182.177.54.4", 4000),
			new Peer("183.177.54.4", 4000),
			new Peer("184.177.54.4", 4000),
		];
		stub(repository, "getPeers").returnValue(peers);

		stub(blockchain, "getBlockPing").returnValue({ block: block.data, count: 2, first: 10_200, last: 10_500 });
		const spyCommunicatorPostBlock = spy(communicator, "postBlock");
		// const spySleep = jest.spyOn(Utils, "sleep"); // TODO: Test sleep

		await networkMonitor.broadcastBlock(block);

		spyCommunicatorPostBlock.calledTimes(Math.ceil((peers.length * 1) / 2));

		// expect(spySleep).toBeCalledTimes(1);
		// expect(spySleep).toBeCalledWith(200); // 500 - (last - first)
	});

	it("#broadcastBlock - should not broadcast if during waiting we have received a new block, when blockPing.last - blockPing.first < 500ms", async ({
		networkMonitor,
	}) => {
		const block = {
			data: {
				blockSignature:
					"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
				generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
				height: 2,
				id: "17882607875259085966",
				numberOfTransactions: 0,
				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				payloadLength: 0,
				previousBlock: "17184958558311101492",
				reward: BigNumber.make("0"),
				timestamp: 46_583_330,
				totalAmount: BigNumber.make("0"),
				totalFee: BigNumber.make("0"),
				version: 0,
			},
			transactions: [],
		};

		const peers = [
			new Peer("180.177.54.4", 4000),
			new Peer("181.177.54.4", 4000),
			new Peer("182.177.54.4", 4000),
			new Peer("183.177.54.4", 4000),
			new Peer("184.177.54.4", 4000),
		];
		stub(repository, "getPeers").returnValue(peers);

		stub(blockchain, "getBlockPing")
			.returnValueNth(0, { block: block.data, last: 10500, first: 10200, count: 2 })
			.returnValueNth(1, {
				block: { ...block.data, id: "11111111", height: 3 },
				last: 10500,
				first: 10200,
				count: 2,
			});

		const spyCommunicatorPostBlock = spy(communicator, "postBlock");
		// const spySleep = jest.spyOn(Utils, "sleep"); // TODO: Test sleep

		await networkMonitor.broadcastBlock(block);

		spyCommunicatorPostBlock.neverCalled();

		// expect(spySleep).toBeCalledTimes(1);
	});
});

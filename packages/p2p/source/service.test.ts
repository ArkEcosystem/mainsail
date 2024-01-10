import { Identifiers } from "@mainsail/contracts";
import { Enums, Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";
import importFresh from "import-fresh";

import { describeSkip, Sandbox } from "../../test-framework/distribution";
import { Peer } from "./peer";
import { PeerVerificationResult } from "./peer-verifier";
import { Service } from "./service";

describeSkip<{
	sandbox: Sandbox;
	networkMonitor: Service;
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
			.whenTargetTagged("plugin", "p2p");
		context.sandbox.app.bind(Identifiers.Application.Version).toConstantValue("0.0.1");
		context.sandbox.app.bind(Identifiers.Kernel.Log.Service).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.PeerNetworkMonitor).to(Service);
		context.sandbox.app.bind(Identifiers.Kernel.EventDispatcher.Service).toConstantValue(emitter);
		context.sandbox.app.bind(Identifiers.PeerCommunicator).toConstantValue(communicator);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue(repository);
		context.sandbox.app.bind(Identifiers.TriggerService).toConstantValue(triggerService);
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(stateStore);

		context.configuration = context.sandbox.app.getTagged(Identifiers.PluginConfiguration, "plugin", "p2p");
		context.networkMonitor = context.sandbox.app.resolve(Service);
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
});

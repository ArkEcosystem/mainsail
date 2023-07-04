import { Contracts, Identifiers } from "@mainsail/contracts";
import { Providers } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { describe, Sandbox } from "../../test-framework";
import { defaults } from "./defaults";
import { NetworkStateStatus } from "./enums";
import { NetworkState } from "./network-state";
import { Peer } from "./peer";
import { PeerVerificationResult } from "./peer-verifier";

describe<{
	sandbox: Sandbox;
	configuration: Providers.PluginConfiguration;
}>("NetworkState", ({ it, assert, beforeEach, stub, spy, each }) => {
	const lastBlock = {
		data: {
			blockSignature:
				"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
			generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
			height: 8,
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

	const blockchainService = { getLastBlock: () => lastBlock };
	const networkMonitor = { app: undefined, completeColdStart: () => {}, isColdStart: () => false };
	const slots = { getSlotNumber: () => 8 };

	const peerRepository = { getPeers: () => [] };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app
			.bind(Identifiers.PluginConfiguration)
			.toConstantValue(new Providers.PluginConfiguration().from("", defaults))
			.whenTargetTagged("plugin", "p2p");
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchainService);

		context.configuration = context.sandbox.app.getTagged(Identifiers.PluginConfiguration, "plugin", "p2p");

		networkMonitor.app = context.sandbox.app;
	});

	it("#analyze - should call completeColdStart() and return ColdStart status, when this is a cold start", async () => {
		stub(networkMonitor, "isColdStart").returnValueOnce(true);
		const spyNetworkMonitorCompleteColdStart = spy(networkMonitor, "completeColdStart");

		const networkState = await NetworkState.analyze(
			networkMonitor as unknown as Contracts.P2P.NetworkMonitor,
			peerRepository as unknown as Contracts.P2P.PeerRepository,
			slots as unknown as Contracts.Crypto.Slots,
		);

		spyNetworkMonitorCompleteColdStart.calledOnce();
		assert.equal(networkState.status, NetworkStateStatus.ColdStart);
	});

	it("#analyze - should return Test status", async () => {
		process.env.CORE_ENV = "test";

		const networkState = await NetworkState.analyze(
			networkMonitor as unknown as Contracts.P2P.NetworkMonitor,
			peerRepository as unknown as Contracts.P2P.PeerRepository,
			slots as unknown as Contracts.Crypto.Slots,
		);

		assert.equal(networkState.status, NetworkStateStatus.Test);

		delete process.env.CORE_ENV;
	});

	it("#analyze - should return BelowMinimumPeers status", async () => {
		const networkState = await NetworkState.analyze(
			networkMonitor as unknown as Contracts.P2P.NetworkMonitor,
			peerRepository as unknown as Contracts.P2P.PeerRepository,
			slots as unknown as Contracts.Crypto.Slots,
		);

		assert.equal(networkState.status, NetworkStateStatus.BelowMinimumPeers);
	});

	it.skip("#analyze - should return accurate quorum values peersNoQuorum peersQuorum peersForked, when returning quorum details", async ({
		configuration,
	}) => {
		configuration.set("minimumNetworkReach", 5);

		const currentSlot = 8;

		const peer1 = new Peer("181.168.65.65", 4000);
		peer1.state = {
			currentSlot: currentSlot + 1,
			forgingAllowed: true,
			header: { height: 9, id: "12112607875259085966" },
			height: 9,
		}; // overheight
		const peer2 = new Peer("182.168.65.65", 4000);
		peer2.state = { currentSlot: currentSlot, forgingAllowed: true, header: {}, height: 8 }; // same height
		const peer3 = new Peer("183.168.65.65", 4000);
		peer3.state = { currentSlot: currentSlot, forgingAllowed: true, header: {}, height: 8 }; // same height
		const peer4 = new Peer("184.168.65.65", 4000);
		peer4.state = { currentSlot: currentSlot - 2, forgingAllowed: false, header: {}, height: 6 }; // below height
		peer4.verificationResult = new PeerVerificationResult(8, 6, 4); // forked
		const peer5 = new Peer("185.168.65.65", 4000);
		peer5.state = { currentSlot: currentSlot - 2, forgingAllowed: false, header: {}, height: 6 }; // below height, not forked
		const peers = [peer1, peer2, peer3, peer4, peer5];

		stub(peerRepository, "getPeers").returnValue(peers);

		const networkState = await NetworkState.analyze(
			networkMonitor as unknown as Contracts.P2P.NetworkMonitor,
			peerRepository as unknown as Contracts.P2P.PeerRepository,
			slots as unknown as Contracts.Crypto.Slots,
		);

		assert.equal(networkState.getQuorum(), 3 / 5); // 2 same-height + 1 below-height but not forked

		assert.equal(networkState.getOverHeightBlockHeaders(), [peer1.state.header]);
	});

	each(
		"#parse - should return NetworkStateStatus.Unknown, when data or data.status is undefined",
		({ dataset }) => {
			assert.equal(NetworkState.parse(dataset), new NetworkState(NetworkStateStatus.Unknown));
		},
		[[undefined], [{}]],
	);

	each(
		"#parse - should return the NetworkState corresponding to the data provided",
		({ dataset }) => {
			const [status, nodeHeight, lastBlockId] = dataset;

			const data = {
				lastBlockId,
				nodeHeight,
				quorumDetails: {
					peersDifferentSlot: 0,
					peersForgingNotAllowed: 1,
					peersForked: 0,
					peersNoQuorum: 3,
					peersOverHeight: 0,
					peersOverHeightBlockHeaders: {},
					peersQuorum: 31,
				},
				status,
			};

			const parsed = NetworkState.parse(data);
			assert.equal(data.status, parsed.status);
			assert.equal(data.nodeHeight, parsed.getNodeHeight());
			assert.equal(data.lastBlockId, parsed.getLastBlockId());
		},
		[
			[NetworkStateStatus.Default, 5, "7aaf2d2dc30fdbe8808b010714fd429f893535f5a90aa2abdb0ca62aa7d35130"],
			[NetworkStateStatus.ColdStart, 144, "416d6ac21f279d9b79dde1fe59c6084628779a3a3cb5b4ea11fa4bf10295143b"],
			[
				NetworkStateStatus.BelowMinimumPeers,
				2,
				"1d582b5c84d5b72da8a25ca2bd95ccef1534c58823a01e0f698786a6fd0be4e6",
			],
			[NetworkStateStatus.Test, 533, "10024d739768a68b43a6e4124718129e1fe07b0461630b3f275b7640d298c3b7"],
			[NetworkStateStatus.Unknown, 5333, "d76512050d858417f71da1f84ca4896a78057c14ea1ecebf70830c7cc87cd49a"],
		],
	);

	it("#getNodeHeight - should return node height", () => {
		const data = {
			lastBlockId: "10024d739768a68b43a6e4124718129e1fe07b0461630b3f275b7640d298c3b7",
			nodeHeight: 31,
			quorumDetails: {
				peersDifferentSlot: 0,
				peersForgingNotAllowed: 1,
				peersForked: 0,
				peersNoQuorum: 7,
				peersOverHeight: 0,
				peersOverHeightBlockHeaders: {},
				peersQuorum: 31,
			},
			status: NetworkStateStatus.Test,
		};

		const networkState = NetworkState.parse(data);

		assert.equal(networkState.getNodeHeight(), 31);
	});

	it("#getLastBlockId - should return lats block id", () => {
		const data = {
			lastBlockId: "10024d739768a68b43a6e4124718129e1fe07b0461630b3f275b7640d298c3b7",
			nodeHeight: 31,
			quorumDetails: {
				peersDifferentSlot: 0,
				peersForgingNotAllowed: 1,
				peersForked: 0,
				peersNoQuorum: 7,
				peersOverHeight: 0,
				peersOverHeightBlockHeaders: {},
				peersQuorum: 31,
			},
			status: NetworkStateStatus.Test,
		};

		const networkState = NetworkState.parse(data);

		assert.equal(networkState.getLastBlockId(), "10024d739768a68b43a6e4124718129e1fe07b0461630b3f275b7640d298c3b7");
	});

	it("#getQuorum - should return 1 when NetworkStateStatus.Test", () => {
		const data = {
			lastBlockId: "10024d739768a68b43a6e4124718129e1fe07b0461630b3f275b7640d298c3b7",
			nodeHeight: 31,
			quorumDetails: {
				peersDifferentSlot: 0,
				peersForgingNotAllowed: 1,
				peersForked: 0,
				peersNoQuorum: 7,
				peersOverHeight: 0,
				peersOverHeightBlockHeaders: {},
				peersQuorum: 31,
			},
			status: NetworkStateStatus.Test,
		};

		const parsed = NetworkState.parse(data);

		assert.equal(parsed.getQuorum(), 1);
	});

	it("#toJson - should return 1 when NetworkStateStatus.Test", () => {
		const data = {
			lastBlockId: "10024d739768a68b43a6e4124718129e1fe07b0461630b3f275b7640d298c3b7",
			nodeHeight: 31,
			quorumDetails: {
				peersDifferentSlot: 0,
				peersForgingNotAllowed: 1,
				peersForked: 0,
				peersNoQuorum: 10,
				peersOverHeight: 0,
				peersOverHeightBlockHeaders: {},
				peersQuorum: 30,
			},
		};
		const expectedJson = { ...data, quorum: 0.75 }; // 30 / (10+30)

		const parsed = NetworkState.parse({ ...data, status: NetworkStateStatus.Default });

		assert.equal(JSON.parse(parsed.toJson()), expectedJson);
	});
});

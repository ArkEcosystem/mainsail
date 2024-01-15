import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { BigNumber } from "@mainsail/utils";

import { describeSkip, Sandbox } from "../../test-framework";
import { Peer } from "./peer";
import { Broadcaster } from "./broadcaster";

describeSkip<{
	sandbox: Sandbox;
	broadcaster: Broadcaster;
	peers: Peer[];
	block: any;
}>("Broadcaster", ({ it, assert, beforeEach, stub, spy, each }) => {
	const logger = { debug: () => {}, info: () => {}, warning: () => {} };
	const configuration = { getRequired: () => {} };
	const repository = { getPeers: () => {} };
	const communicator = { postBlock: () => {}, postTransactions: () => {} };
	const serializer = { serialize: () => {} };
	const blockchain = { getBlockPing: () => {}, getLastBlock: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(logger);
		context.sandbox.app.bind(Identifiers.ServiceProvider.Configuration).toConstantValue(configuration);
		context.sandbox.app.bind(Identifiers.P2P.Peer.Repository).toConstantValue(repository);
		context.sandbox.app.bind(Identifiers.P2P.Peer.Communicator).toConstantValue(communicator);
		context.sandbox.app.bind(Identifiers.Cryptography.Transaction.Serializer).toConstantValue(serializer);
		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
		context.sandbox.app.bind(Identifiers.Services.Queue.Factory).toConstantValue({});

		context.broadcaster = context.sandbox.app.resolve(Broadcaster);

		context.peers = [
			context.sandbox.app.resolve(Peer).init("180.177.54.4", 4000),
			context.sandbox.app.resolve(Peer).init("181.177.54.4", 4000),
			context.sandbox.app.resolve(Peer).init("182.177.54.4", 4000),
			context.sandbox.app.resolve(Peer).init("183.177.54.4", 4000),
			context.sandbox.app.resolve(Peer).init("184.177.54.4", 4000),
		];

		context.block = {
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
	});

	it("#broadcastTransactions - should warn when attempting to broadcast empty array", async ({ broadcaster }) => {
		const spyLoggerWarning = stub(logger, "warning");
		const spyCommunicatorPostTransactions = stub(communicator, "postTransactions");

		await broadcaster.broadcastTransactions([]);

		spyLoggerWarning.calledOnce();
		spyLoggerWarning.calledWith("Broadcasting 0 transactions");
		spyCommunicatorPostTransactions.neverCalled();
	});

	it("#broadcastTransactions - should broadcast transaction to peers", async ({ broadcaster }) => {
		const peers = [{}, {}, {}];
		const transactions = [{}];

		const spyLoggerWarning = stub(logger, "warning");
		const spyLoggerDebug = stub(logger, "debug");
		const spyCommunicatorPostTransactions = stub(communicator, "postTransactions");
		const spyConfigurationGetRequired = stub(configuration, "getRequired").returnValue(3);
		const spyRepositoryGetPeers = stub(repository, "getPeers").returnValue(peers);
		const spySerialzierSerialzie = stub(serializer, "serialize").returnValue(Buffer.from(""));

		await broadcaster.broadcastTransactions(transactions as Contracts.Crypto.Transaction[]);

		spyLoggerWarning.neverCalled();
		spyLoggerDebug.calledWith("Broadcasting 1 transaction to 3 peers");
		spyRepositoryGetPeers.calledOnce();
		spySerialzierSerialzie.calledOnce();
		spyConfigurationGetRequired.calledWith("maxPeersBroadcast");
		spyCommunicatorPostTransactions.calledTimes(3);
	});

	each(
		"#broadcastBlock - should not broadcast to any peer when blockPing >= 4",
		async ({ context, dataset }) => {
			const count = dataset;

			stub(repository, "getPeers").returnValue(context.peers);

			stub(blockchain, "getBlockPing").returnValueOnce({
				block: context.block.data,
				count,
				first: 10_200,
				last: 10_900,
			});
			const spyCommunicatorPostBlock = spy(communicator, "postBlock");

			await context.broadcaster.broadcastBlock(context.block);

			spyCommunicatorPostBlock.neverCalled();
		},
		[4, 5, 10, 50],
	);

	each(
		"#broadcastBlock - should broadcast to (4 - blockPing)/4 of our peers when blockPing < 4",
		async ({ context, dataset }) => {
			const count = dataset;

			stub(repository, "getPeers").returnValue(context.peers);

			stub(blockchain, "getBlockPing").returnValueOnce({
				block: context.block.data,
				count,
				first: 10_200,
				last: 10_900,
			});
			const spyCommunicatorPostBlock = spy(communicator, "postBlock");

			await context.broadcaster.broadcastBlock(context.block);

			spyCommunicatorPostBlock.calledTimes(Math.ceil((context.peers.length * (4 - count)) / 4));
		},
		[0, 1, 2, 3],
	);

	each(
		"#broadcastBlock - should broadcast to all of our peers when block.id doesnt match blockPing.id",
		async ({ context, dataset }) => {
			const count = dataset;

			const temporaryBlock = Utils.cloneDeep(context.block);

			temporaryBlock.data.id = "random_id";

			stub(repository, "getPeers").returnValue(context.peers);

			stub(blockchain, "getBlockPing").returnValueOnce({
				block: temporaryBlock.data,
				count,
				first: 10_200,
				last: 10_900,
			});
			const spyCommunicatorPostBlock = spy(communicator, "postBlock");

			await context.broadcaster.broadcastBlock(context.block);

			spyCommunicatorPostBlock.calledTimes(context.peers.length);
		},
		[0, 1, 2, 3],
	);

	it("#broadcastBlock - should not wait if block is from forger, when blockPing.last - blockPing.first < 500ms", async ({
		broadcaster,
		peers,
		block,
	}) => {
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

		await broadcaster.broadcastBlock(block);

		spyCommunicatorPostBlock.calledTimes(peers.length);
		// spySleep.neverCalled();
	});

	it("#broadcastBlock - should wait until 500ms have elapsed between blockPing.last and blockPing.first before broadcasting, when blockPing.last - blockPing.first < 500ms", async ({
		broadcaster,
		peers,
		block,
	}) => {
		stub(repository, "getPeers").returnValue(peers);

		stub(blockchain, "getBlockPing").returnValue({ block: block.data, count: 2, first: 10_200, last: 10_500 });
		const spyCommunicatorPostBlock = spy(communicator, "postBlock");
		// const spySleep = jest.spyOn(Utils, "sleep"); // TODO: Test sleep

		await broadcaster.broadcastBlock(block);

		spyCommunicatorPostBlock.calledTimes(Math.ceil((peers.length * 1) / 2));

		// expect(spySleep).toBeCalledTimes(1);
		// expect(spySleep).toBeCalledWith(200); // 500 - (last - first)
	});

	it("#broadcastBlock - should not broadcast if during waiting we have received a new block, when blockPing.last - blockPing.first < 500ms", async ({
		broadcaster,
		peers,
		block,
	}) => {
		stub(repository, "getPeers").returnValue(peers);

		stub(blockchain, "getBlockPing")
			.returnValueNth(0, { block: block.data, count: 2, first: 10_200, last: 10_500 })
			.returnValueNth(1, {
				block: { ...block.data, height: 3, id: "11111111" },
				count: 2,
				first: 10_200,
				last: 10_500,
			});

		const spyCommunicatorPostBlock = spy(communicator, "postBlock");
		// const spySleep = jest.spyOn(Utils, "sleep"); // TODO: Test sleep

		await broadcaster.broadcastBlock(block);

		spyCommunicatorPostBlock.neverCalled();

		// expect(spySleep).toBeCalledTimes(1);
	});
});

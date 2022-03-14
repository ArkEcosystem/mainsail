import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import delay from "delay";

import { describe } from "../../../../core-test-framework";
import { DownloadBlocks } from "./download-blocks";

describe<{
	container: Container;
	blockchain;
	lastBlock;
	stateStore;
	logger;
	peerNetworkMonitor;
	application;
	queue: any;
	slots: any;
}>("DownloadBlocks", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.queue = {
			size: () => {},
		};
		context.blockchain = {
			clearQueue: () => {},
			dispatch: () => {},
			enqueueBlocks: () => {},
			getQueue: () => context.queue,
			isStopped: () => false,
		};
		context.lastBlock = {
			data: { height: 3333, id: "1234", timestamp: 11_111 },
		};
		context.stateStore = {
			getLastBlock: () => context.lastBlock,
			getLastDownloadedBlock: () => {},
			getNoBlockCounter: () => 0,
			setLastDownloadedBlock: () => {},
			setNoBlockCounter: () => {},
		};
		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		};
		context.peerNetworkMonitor = {
			downloadBlocksFromHeight: () => {},
		};

		context.slots = {
			getSlotNumber: () => {},
		};

		context.application = {};

		context.container = new Container();
		context.container.bind(Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Identifiers.PeerNetworkMonitor).toConstantValue(context.peerNetworkMonitor);
		context.container.bind(Identifiers.Cryptography.Time.Slots).toConstantValue(context.slots);
	});

	it("should do nothing when blockchain.isStopped", async (context) => {
		const downloadBlocks = context.container.resolve<DownloadBlocks>(DownloadBlocks);

		stub(context.blockchain, "isStopped").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		await downloadBlocks.handle();

		dispatchSpy.neverCalled();
	});

	it("should do nothing when stateStore.getLastDownloadedBlock !== lastDownloadedBlock", async (context) => {
		const downloadBlocks = context.container.resolve<DownloadBlocks>(DownloadBlocks);

		stub(context.peerNetworkMonitor, "downloadBlocksFromHeight").resolvedValue(async () => {
			await delay(100);
			return [];
		});
		const dispatchSpy = spy(context.blockchain, "dispatch");

		const handle = downloadBlocks.handle();

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({
			data: { height: 233, id: "987", timestamp: 111 },
		});

		await handle;

		dispatchSpy.neverCalled();
	});

	it("should dispatch NOBLOCK when downloadBlocksFromHeight returns no block", async (context) => {
		const downloadBlocks = context.container.resolve<DownloadBlocks>(DownloadBlocks);

		stub(context.queue, "size").returnValue(0);
		stub(context.peerNetworkMonitor, "downloadBlocksFromHeight").returnValue([]);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setNoBlockCounterSpy = spy(context.stateStore, "setNoBlockCounter");

		await downloadBlocks.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NOBLOCK");
		setNoBlockCounterSpy.calledWith(1);
	});

	it("should dispatch NOBLOCK when downloadBlocksFromHeight returns no chained block", async (context) => {
		const downloadBlocks = context.container.resolve<DownloadBlocks>(DownloadBlocks);

		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(context.queue, "size").returnValue(0);
		stub(context.peerNetworkMonitor, "downloadBlocksFromHeight").returnValue([{ height: 11 }]);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setNoBlockCounterSpy = spy(context.stateStore, "setNoBlockCounter");

		await downloadBlocks.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NOBLOCK");
		setNoBlockCounterSpy.calledWith(1);
	});

	it("should enqueueBlocks and dispatch DOWNLOADED when downloadBlocksFromHeight returns chained blocks", async (context) => {
		const downloadBlocks = context.container.resolve<DownloadBlocks>(DownloadBlocks);

		stub(context.peerNetworkMonitor, "downloadBlocksFromHeight").returnValue([
			{
				height: context.lastBlock.data.height + 1,
				previousBlock: context.lastBlock.data.id,
				timestamp: context.lastBlock.data.timestamp + 20,
			},
		]);
		stub(context.slots, "getSlotNumber").returnValueNth(0, 1).returnValueNth(1, 2);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const enqueueBlocksSpy = spy(context.blockchain, "enqueueBlocks");

		await downloadBlocks.handle();

		enqueueBlocksSpy.calledOnce();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("DOWNLOADED");
	});

	it("should dispatch NOBLOCK when enqueueBlocks throws exception", async (context) => {
		const downloadBlocks = context.container.resolve<DownloadBlocks>(DownloadBlocks);

		stub(context.peerNetworkMonitor, "downloadBlocksFromHeight").returnValue([
			{
				height: context.lastBlock.data.height + 1,
				previousBlock: context.lastBlock.data.id,
				timestamp: context.lastBlock.data.timestamp + 20,
			},
		]);
		stub(context.blockchain, "enqueueBlocks").callsFake(() => {
			throw new Error("oops");
		});
		const dispatchSpy = spy(context.blockchain, "dispatch");

		await downloadBlocks.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NOBLOCK");
	});
});

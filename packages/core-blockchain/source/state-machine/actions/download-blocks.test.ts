import { Container, Utils } from "@arkecosystem/core-kernel";
import delay from "delay";
import { describe } from "../../../../core-test-framework";

import { DownloadBlocks } from "./download-blocks";

describe<{
	container: Container.Container;
	blockchain;
	lastBlock;
	stateStore;
	logger;
	peerNetworkMonitor;
	application;
	queue: any;
}>("DownloadBlocks", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.queue = {
			size: () => undefined,
		};
		context.blockchain = {
			isStopped: () => false,
			dispatch: () => undefined,
			getQueue: () => context.queue,
			clearQueue: () => undefined,
			enqueueBlocks: () => undefined,
		};
		context.lastBlock = {
			data: { id: "1234", height: 3333, timestamp: 11111 },
		};
		context.stateStore = {
			getLastBlock: () => context.lastBlock,
			getLastDownloadedBlock: () => undefined,
			setLastDownloadedBlock: () => undefined,
			getNoBlockCounter: () => 0,
			setNoBlockCounter: () => undefined,
		};
		context.logger = {
			warning: () => undefined,
			debug: () => undefined,
			info: () => undefined,
			error: () => undefined,
		};
		context.peerNetworkMonitor = {
			downloadBlocksFromHeight: () => undefined,
		};

		context.application = {};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Container.Identifiers.PeerNetworkMonitor).toConstantValue(context.peerNetworkMonitor);

		const getTimeStampForBlock = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		stub(Utils.forgingInfoCalculator, "getBlockTimeLookup").returnValue(getTimeStampForBlock);
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
			data: { id: "987", height: 233, timestamp: 111 },
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

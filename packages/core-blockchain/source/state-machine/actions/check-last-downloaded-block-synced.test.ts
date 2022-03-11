import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { CheckLastDownloadedBlockSynced } from "./check-last-downloaded-block-synced";

describe<{
	container: Container.Container;
	blockchain: any;
	stateStore: any;
	peerNetworkMonitor: any;
	queue: any;
	logger: any;
}>("CheckLastDownloadedBlockSynced", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.queue = {
			size: () => undefined,
			isRunning: () => true,
		};
		context.blockchain = {
			isSynced: () => undefined,
			dispatch: () => undefined,
			getQueue: () => context.queue,
		};
		context.stateStore = {
			noBlockCounter: undefined,
			p2pUpdateCounter: undefined,
			numberOfBlocksToRollback: undefined,
			getLastDownloadedBlock: () => undefined,
			getNoBlockCounter: () => 0,
			setNoBlockCounter: () => undefined,
			getP2pUpdateCounter: () => 0,
			setP2pUpdateCounter: () => undefined,
			setNumberOfBlocksToRollback: () => undefined,
			getNetworkStart: () => false,
		};
		context.peerNetworkMonitor = {
			checkNetworkHealth: () => undefined,
		};
		context.logger = {
			warn: () => undefined,
			debug: () => undefined,
			info: () => undefined,
			error: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Container.Identifiers.PeerNetworkMonitor).toConstantValue(context.peerNetworkMonitor);

		process.env.CORE_ENV = "";
	});

	it("should dispatch NOTSYNCED by default", async (context) => {
		const checkLastDownloadedBlockSynced =
			context.container.resolve<CheckLastDownloadedBlockSynced>(CheckLastDownloadedBlockSynced);

		const dispatchSpy = spy(context.blockchain, "dispatch");

		process.env.CORE_ENV = "";
		await checkLastDownloadedBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NOTSYNCED");
	});

	it("should dispatch TEST when process.env.CORE_ENV === 'test'", async (context) => {
		const checkLastDownloadedBlockSynced =
			context.container.resolve<CheckLastDownloadedBlockSynced>(CheckLastDownloadedBlockSynced);

		const dispatchSpy = spy(context.blockchain, "dispatch");

		process.env.CORE_ENV = "test";
		await checkLastDownloadedBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("TEST");
	});

	it("should dispatch SYNCED when stateStore.getNetworkStart", async (context) => {
		const checkLastDownloadedBlockSynced =
			context.container.resolve<CheckLastDownloadedBlockSynced>(CheckLastDownloadedBlockSynced);

		stub(context.stateStore, "getNetworkStart").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		await checkLastDownloadedBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("SYNCED");
	});

	it("should dispatch PAUSED when blockchain.queue.length() > 100", async (context) => {
		const checkLastDownloadedBlockSynced =
			context.container.resolve<CheckLastDownloadedBlockSynced>(CheckLastDownloadedBlockSynced);

		stub(context.queue, "size").returnValue(101);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		await checkLastDownloadedBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("PAUSED");
	});

	it("when stateStore.getP2pUpdateCounter + 1 > 3 should dispatch NETWORKHALTED when !networkStatus.forked", async (context) => {
		const checkLastDownloadedBlockSynced =
			context.container.resolve<CheckLastDownloadedBlockSynced>(CheckLastDownloadedBlockSynced);

		stub(context.stateStore, "getNoBlockCounter").returnValue(6);
		stub(context.queue, "isRunning").returnValue(false);
		stub(context.stateStore, "getP2pUpdateCounter").returnValue(3);
		stub(context.peerNetworkMonitor, "checkNetworkHealth").returnValue({ forked: false });
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setP2pUpdateCounterSpy = spy(context.stateStore, "setP2pUpdateCounter");
		const setNoBlockCounterSpy = spy(context.stateStore, "setNoBlockCounter");

		await checkLastDownloadedBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NETWORKHALTED");
		setP2pUpdateCounterSpy.calledWith(0);
		setNoBlockCounterSpy.calledWith(0);
	});

	it("when stateStore.getP2pUpdateCounter + 1 > 3should dispatch FORK when networkStatus.forked", async (context) => {
		const checkLastDownloadedBlockSynced =
			context.container.resolve<CheckLastDownloadedBlockSynced>(CheckLastDownloadedBlockSynced);

		stub(context.stateStore, "getNoBlockCounter").returnValue(6);
		stub(context.queue, "isRunning").returnValue(false);
		stub(context.stateStore, "getP2pUpdateCounter").returnValue(3);
		stub(context.peerNetworkMonitor, "checkNetworkHealth").returnValue({ forked: true });
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setP2pUpdateCounterSpy = spy(context.stateStore, "setP2pUpdateCounter");
		const setNumberOfBlocksToRollbackSpy = spy(context.stateStore, "setNumberOfBlocksToRollback");

		await checkLastDownloadedBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("FORK");
		setP2pUpdateCounterSpy.calledWith(0);
		setNumberOfBlocksToRollbackSpy.calledWith(0);
	});

	it("when stateStore.getP2pUpdateCounter + 1 <= 3 should dispatch NETWORKHALTED and do stateStore.setP2pUpdateCounter++", async (context) => {
		const checkLastDownloadedBlockSynced =
			context.container.resolve<CheckLastDownloadedBlockSynced>(CheckLastDownloadedBlockSynced);

		stub(context.stateStore, "getNoBlockCounter").returnValue(6);
		stub(context.queue, "isRunning").returnValue(false);
		stub(context.stateStore, "getP2pUpdateCounter").returnValue(0);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setP2pUpdateCounterSpy = spy(context.stateStore, "setP2pUpdateCounter");

		await checkLastDownloadedBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NETWORKHALTED");
		setP2pUpdateCounterSpy.calledWith(1);
	});

	it("should dispatch SYNCED when stateStore.getLastDownloadedBlock && blockchain.isSynced()", async (context) => {
		const checkLastDownloadedBlockSynced =
			context.container.resolve<CheckLastDownloadedBlockSynced>(CheckLastDownloadedBlockSynced);

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({});
		stub(context.blockchain, "isSynced").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setNoBlockCounterSpy = spy(context.stateStore, "setNoBlockCounter");

		await checkLastDownloadedBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("SYNCED");
		setNoBlockCounterSpy.calledWith(0);
	});
});

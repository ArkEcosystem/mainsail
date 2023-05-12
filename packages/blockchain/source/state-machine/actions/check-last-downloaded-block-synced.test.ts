import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework";
import { CheckLastDownloadedBlockSynced } from "./check-last-downloaded-block-synced";

describe<{
	container: Container;
	blockchain: any;
	stateStore: any;
	queue: any;
	logger: any;
}>("CheckLastDownloadedBlockSynced", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.queue = {
			isRunning: () => true,
			size: () => {},
		};
		context.blockchain = {
			dispatch: () => {},
			getQueue: () => context.queue,
			isSynced: () => {},
		};
		context.stateStore = {
			getLastDownloadedBlock: () => {},
			getNetworkStart: () => false,
			getNoBlockCounter: () => 0,
			getP2pUpdateCounter: () => 0,
			noBlockCounter: undefined,
			numberOfBlocksToRollback: undefined,
			p2pUpdateCounter: undefined,
			setNoBlockCounter: () => {},
			setNumberOfBlocksToRollback: () => {},
			setP2pUpdateCounter: () => {},
		};
		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warn: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);

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

	it("when stateStore.getP2pUpdateCounter + 1 > 3 should dispatch NETWORKHALTED", async (context) => {
		const checkLastDownloadedBlockSynced =
			context.container.resolve<CheckLastDownloadedBlockSynced>(CheckLastDownloadedBlockSynced);

		stub(context.stateStore, "getNoBlockCounter").returnValue(6);
		stub(context.queue, "isRunning").returnValue(false);
		stub(context.stateStore, "getP2pUpdateCounter").returnValue(3);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setP2pUpdateCounterSpy = spy(context.stateStore, "setP2pUpdateCounter");
		const setNoBlockCounterSpy = spy(context.stateStore, "setNoBlockCounter");

		await checkLastDownloadedBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NETWORKHALTED");
		setP2pUpdateCounterSpy.calledWith(0);
		setNoBlockCounterSpy.calledWith(0);
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

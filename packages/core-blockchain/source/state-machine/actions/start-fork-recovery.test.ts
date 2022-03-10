import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { StartForkRecovery } from "./start-fork-recovery";

describe<{
	container: Container.Container;
	logger: any;
	blockchain: any;
	stateStore: any;
	peerNetworkMonitor: any;
	application: any;
	queue: any;
}>("StartForkRecovery", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.queue = {
			resume: () => true,
		};
		context.logger = {
			warning: () => undefined,
			debug: () => undefined,
			info: () => undefined,
		};
		context.blockchain = {
			dispatch: () => undefined,
			clearAndStopQueue: () => undefined,
			removeBlocks: () => undefined,
			getQueue: () => context.queue,
		};
		context.stateStore = {
			getNumberOfBlocksToRollback: () => 0,
			setNumberOfBlocksToRollback: () => undefined,
		};
		context.peerNetworkMonitor = {
			refreshPeersAfterFork: () => undefined,
		};

		context.application = {};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Container.Identifiers.PeerNetworkMonitor).toConstantValue(context.peerNetworkMonitor);
	});

	it("should clearAndStopQueue, removeBlocks, refreshPeersAfterFork, dispatch SUCCESS and resume queue", async (context) => {
		const startForkRecovery = context.container.resolve<StartForkRecovery>(StartForkRecovery);

		const mockRandomValue = 0.1;
		stub(Math, "random").returnValue(mockRandomValue);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const clearAndStopQueueSpy = spy(context.blockchain, "clearAndStopQueue");
		const removeBlocksSpy = spy(context.blockchain, "removeBlocks");
		const refreshPeersAfterForkSpy = spy(context.peerNetworkMonitor, "refreshPeersAfterFork");
		const queueResumeSpy = spy(context.queue, "resume");

		await startForkRecovery.handle();

		clearAndStopQueueSpy.calledOnce();
		removeBlocksSpy.calledOnce();
		removeBlocksSpy.calledWith(4 + Math.floor(mockRandomValue * 99));
		refreshPeersAfterForkSpy.calledOnce();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("SUCCESS");
		queueResumeSpy.calledOnce();
	});

	it("should set stateStore.numberOfBlocksToRollback to 0 blocks when defined", async (context) => {
		const startForkRecovery = context.container.resolve<StartForkRecovery>(StartForkRecovery);

		stub(context.stateStore, "getNumberOfBlocksToRollback").returnValue(7);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const clearAndStopQueueSpy = spy(context.blockchain, "clearAndStopQueue");
		const removeBlocksSpy = spy(context.blockchain, "removeBlocks");
		const setNumberOfBlocksToRollbackSpy = spy(context.stateStore, "setNumberOfBlocksToRollback");
		const refreshPeersAfterForkSpy = spy(context.peerNetworkMonitor, "refreshPeersAfterFork");
		const queueResumeSpy = spy(context.queue, "resume");

		await startForkRecovery.handle();

		setNumberOfBlocksToRollbackSpy.calledWith(0);
		clearAndStopQueueSpy.calledOnce();
		removeBlocksSpy.calledOnce();
		removeBlocksSpy.calledWith(7);
		refreshPeersAfterForkSpy.calledOnce();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("SUCCESS");
		queueResumeSpy.calledOnce();
	});
});

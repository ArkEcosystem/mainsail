import { Container, Contracts, Enums, Services, Utils as AppUtils } from "@arkecosystem/core-kernel";
import { Crypto, Interfaces, Managers, Networks, Utils } from "@arkecosystem/crypto";
import { MemoryQueue } from "@arkecosystem/core-kernel/distribution/services/queue/drivers/memory";
import { Actions } from "@arkecosystem/core-state";
import { describe, Sandbox } from "../../core-test-framework";

import sinon from "sinon";
import delay from "delay";

import { ProcessBlockAction } from "./actions";
import { Blockchain } from "./blockchain";
import { ProcessBlocksJob } from "./process-blocks-job";

describe<{
	sandbox: Sandbox;
	configuration: any;
	logService: any;
	stateStore: any;
	databaseService: any;
	blockRepository: any;
	transactionPoolService: any;
	stateMachine: any;
	eventDispatcherService: any;
	peerNetworkMonitor: any;
	peerRepository: any;
	blockProcessor: any;
	databaseInteractions: any;
	blockData: Interfaces.IBlockData;
	blockHeight1: any;
	blockHeight2: any;
	blockHeight3: any;
}>("Blockchain", ({ assert, beforeEach, it, spy, spyFn, stub }) => {
	beforeEach((context) => {
		context.configuration = {
			getOptional: (key, defaultValue) => defaultValue,
		};
		context.logService = {
			warning: () => undefined,
			info: () => undefined,
			error: () => undefined,
			debug: () => undefined,
		};
		context.stateStore = {
			reset: () => undefined,
			getMaxLastBlocks: () => 200,
			clearWakeUpTimeout: () => undefined,
			wakeUpTimeout: undefined,
			blockPing: undefined,
			getGenesisBlock: () => ({ data: Networks.testnet.genesisBlock }),
			getLastDownloadedBlock: () => undefined,
			isStarted: () => undefined,
			setLastDownloadedBlock: () => undefined,
			getNumberOfBlocksToRollback: () => 0,
			setNumberOfBlocksToRollback: () => undefined,
			getNetworkStart: () => false,
			setNetworkStart: () => undefined,
			setLastStoredBlockHeight: () => undefined,
			getLastBlock: () => undefined,
			setLastBlock: () => undefined,
			setForkedBlock: () => undefined,
			setWakeUpTimeout: () => undefined,
			pushPingBlock: () => undefined,
			pingBlock: () => undefined,
			getBlockPing: () => undefined,
		};
		context.databaseService = {
			getBlocks: () => undefined,
			getLastBlock: () => undefined,
			deleteRound: () => undefined,
			revertBlock: () => undefined,
		};
		context.blockRepository = {
			deleteBlocks: () => undefined,
			deleteTopBlocks: () => undefined,
			saveBlocks: () => undefined,
		};
		context.transactionPoolService = {
			readdTransactions: () => undefined,
		};
		context.stateMachine = {
			transition: () => undefined,
		};
		context.eventDispatcherService = {
			listen: () => undefined,
			dispatch: () => undefined,
		};
		context.peerNetworkMonitor = {
			cleansePeers: () => undefined,
			broadcastBlock: () => undefined,
			checkNetworkHealth: () => undefined,
		};
		context.peerRepository = {
			hasPeers: () => undefined,
		};
		context.blockProcessor = {
			process: () => undefined,
		};
		context.databaseInteractions = {
			getTopBlocks: () => undefined,
			getLastBlock: () => undefined,
			restoreCurrentRound: () => undefined,
			revertBlock: () => undefined,
			deleteRound: () => undefined,
			getActiveDelegates: () => [],
		};

		context.blockData = { height: 30122 } as Interfaces.IBlockData;

		context.blockHeight1 = {
			data: {
				id: "17184958558311101492",
				version: 0,
				timestamp: 0,
				height: 1,
			},
			transactions: [],
		};
		context.blockHeight2 = {
			data: {
				id: "17882607875259085966",
				version: 0,
				timestamp: 46583330,
				height: 2,
				reward: Utils.BigNumber.make("0"),
				previousBlock: "17184958558311101492",
				numberOfTransactions: 0,
				totalAmount: Utils.BigNumber.make("0"),
				totalFee: Utils.BigNumber.make("0"),
				payloadLength: 0,
				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
				blockSignature:
					"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
				createdAt: "2018-09-11T16:48:50.550Z",
			},
			transactions: [],
		};
		context.blockHeight3 = {
			data: {
				id: "7242383292164246617",
				version: 0,
				timestamp: 46583338,
				height: 3,
				reward: Utils.BigNumber.make("0"),
				previousBlock: "17882607875259085966",
				numberOfTransactions: 0,
				totalAmount: Utils.BigNumber.make("0"),
				totalFee: Utils.BigNumber.make("0"),
				payloadLength: 0,
				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				generatorPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
				blockSignature:
					"304402204087bb1d2c82b9178b02b9b3f285de260cdf0778643064fe6c7aef27321d49520220594c57009c1fca543350126d277c6adeb674c00685a464c3e4bf0d634dc37e39",
				createdAt: "2018-09-11T16:48:58.431Z",
			},
			transactions: [],
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Container.Identifiers.PluginConfiguration).toConstantValue(context.configuration);
		context.sandbox.app.bind(Container.Identifiers.LogService).toConstantValue(context.logService);
		context.sandbox.app.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		context.sandbox.app.bind(Container.Identifiers.DatabaseService).toConstantValue(context.databaseService);
		context.sandbox.app
			.bind(Container.Identifiers.DatabaseInteraction)
			.toConstantValue(context.databaseInteractions);
		context.sandbox.app
			.bind(Container.Identifiers.DatabaseBlockRepository)
			.toConstantValue(context.blockRepository);
		context.sandbox.app
			.bind(Container.Identifiers.TransactionPoolService)
			.toConstantValue(context.transactionPoolService);
		context.sandbox.app.bind(Container.Identifiers.StateMachine).toConstantValue(context.stateMachine);
		context.sandbox.app
			.bind(Container.Identifiers.EventDispatcherService)
			.toConstantValue(context.eventDispatcherService);
		context.sandbox.app.bind(Container.Identifiers.PeerNetworkMonitor).toConstantValue(context.peerNetworkMonitor);
		context.sandbox.app.bind(Container.Identifiers.PeerRepository).toConstantValue(context.peerRepository);
		context.sandbox.app.bind(Container.Identifiers.BlockchainService).to(Blockchain).inSingletonScope();
		context.sandbox.app.bind(Container.Identifiers.BlockProcessor).toConstantValue(context.blockProcessor);
		context.sandbox.app.bind(Container.Identifiers.DatabaseTransactionRepository).toConstantValue({});
		context.sandbox.app.bind(Container.Identifiers.WalletRepository).toConstantValue({});

		context.sandbox.app
			.bind(Container.Identifiers.TriggerService)
			.to(Services.Triggers.Triggers)
			.inSingletonScope();
		context.sandbox.app
			.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
			.bind("processBlock", new ProcessBlockAction());

		context.sandbox.app
			.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
			.bind("getActiveDelegates", new Actions.GetActiveDelegatesAction(context.sandbox.app));

		context.sandbox.app.bind(Container.Identifiers.QueueFactory).toFactory(
			(ctx: Container.interfaces.Context) =>
				async <K, T>(name?: string): Promise<Contracts.Kernel.Queue> =>
					context.sandbox.app.resolve<Contracts.Kernel.Queue>(MemoryQueue).make(),
		);

		const getTimeStampForBlock = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		const spyblockTimeLookup = stub(AppUtils.forgingInfoCalculator, "getBlockTimeLookup");
		spyblockTimeLookup.resolvedValue(getTimeStampForBlock);

		Managers.configManager.setFromPreset("testnet");
	});

	it("initialize should log a warning if networkStart option is provided", (context) => {
		stub(context.configuration, "getOptional").returnValueOnce(true);
		stub(context.stateStore, "getNetworkStart").returnValue(true);
		const logWarningSpy = spy(context.logService, "warning");
		const setNetworkStartSpy = spy(context.stateStore, "setNetworkStart");

		context.sandbox.app.resolve<Blockchain>(Blockchain);

		logWarningSpy.calledOnce();
		setNetworkStartSpy.calledWith(true);
	});

	it("initialize should not log a warning if networkStart option isn't provided", (context) => {
		const logWarningSpy = spy(context.logService, "warning");

		context.sandbox.app.resolve<Blockchain>(Blockchain);

		logWarningSpy.neverCalled();
	});

	it("getQueue should return instance of queue", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		assert.instance(blockchain.getQueue(), MemoryQueue);
	});

	it("dispatch should call transition method on stateMachine with the event provided", (context) => {
		const logWarningSpy = spy(context.stateMachine, "transition");

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const eventToDispatch = "any.event.to.dispatch";

		logWarningSpy.neverCalled();
		blockchain.dispatch(eventToDispatch);

		logWarningSpy.calledTimes(1);
		logWarningSpy.calledWith(eventToDispatch);
	});

	it("boot should dispatch 'START'", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const dispatchSpy = spy(blockchain, "dispatch");

		assert.false(blockchain.isBooted());

		stub(context.stateStore, "isStarted").returnValue(true);

		await blockchain.boot();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("START");
		assert.true(blockchain.isBooted());
	});

	it("boot should dispatch START and return true even if stateStore is not ready when skipStartedCheck === true", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const dispatchSpy = spy(blockchain, "dispatch");

		context.stateStore.started = false;
		const bootResult = await blockchain.boot(true);

		assert.true(bootResult);
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("START");

		dispatchSpy.reset();

		// should be the same with process.env.CORE_SKIP_BLOCKCHAIN_STARTED_CHECK
		context.stateStore.started = false;
		process.env.CORE_SKIP_BLOCKCHAIN_STARTED_CHECK = "true";
		const bootResultEnv = await blockchain.boot();

		assert.true(bootResultEnv);
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("START");

		delete process.env.CORE_SKIP_BLOCKCHAIN_STARTED_CHECK;
	});

	it("boot should wait for stateStore to be started before resolving", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const isStartedStub = stub(context.stateStore, "isStarted");
		isStartedStub.returnValue(false);
		const resolved = spyFn();
		const checkBootResolved = async () => {
			await blockchain.boot();
			resolved();
		};
		checkBootResolved();

		// will not resolve after 2 seconds while context.stateStore.started is false
		await delay(2000);
		assert.true(resolved.notCalled);

		// will resolve after 1 second when context.stateStore.started is true
		isStartedStub.restore();
		stub(context.stateStore, "isStarted").returnValue(true);
		await delay(1100);

		assert.true(resolved.calledOnce);
	});

	it("boot should call cleansePeers and set listener on ForgerEvent.Missing and RoundEvent.Applied", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		stub(context.stateStore, "isStarted").returnValue(true);
		const cleansePeersSpy = spy(context.peerNetworkMonitor, "cleansePeers");
		const listenSpy = spy(context.eventDispatcherService, "listen");

		cleansePeersSpy.neverCalled();

		await blockchain.boot();

		cleansePeersSpy.calledOnce();

		listenSpy.calledTimes(2);
		listenSpy.calledNthWith(0, Enums.ForgerEvent.Missing, {
			handle: sinon.match.func,
		});
		listenSpy.calledNthWith(1, Enums.RoundEvent.Applied, {
			handle: sinon.match.func,
		});
	});

	it("dispose should call clearWakeUpTimeout on stateStore and dispatch 'STOP'", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		const dispatchSpy = spy(blockchain, "dispatch");
		const clearWakeUpTimeoutSpy = spy(context.stateStore, "clearWakeUpTimeout");

		assert.false(blockchain.isStopped());
		await blockchain.dispose();

		clearWakeUpTimeoutSpy.calledOnce();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("STOP");
		assert.true(blockchain.isStopped());
	});

	it("dispose should ignore if already stopped", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const dispatchSpy = spy(blockchain, "dispatch");

		// @ts-ignore
		blockchain.stopped = true;

		await blockchain.dispose();

		dispatchSpy.neverCalled();
	});

	it("setWakeUp should set wakeUpTimeout on stateStore", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const setWakeUpTimeoutSpy = spy(context.stateStore, "setWakeUpTimeout");

		blockchain.setWakeUp();

		setWakeUpTimeoutSpy.calledOnce();
	});

	it("setWakeUp should dispatch WAKEUP when wake up function is called", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const dispatchSpy = spy(blockchain, "dispatch");
		const setWakeUpTimeoutSpy = spy(context.stateStore, "setWakeUpTimeout");

		blockchain.setWakeUp();

		dispatchSpy.neverCalled();
		setWakeUpTimeoutSpy.calledWith(sinon.match.func, 60_000);

		// Call given callback function
		setWakeUpTimeoutSpy.getCallArgs(0)[0]();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("WAKEUP");
	});

	it("resetWakeUp should call stateStore clearWakeUpTimeout and own setWakeUp method", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const clearWakeUpTimeoutSpy = spy(context.stateStore, "clearWakeUpTimeout");
		const setWakeUpSpy = spy(blockchain, "setWakeUp");

		blockchain.resetWakeUp();

		clearWakeUpTimeoutSpy.calledOnce();
		setWakeUpSpy.calledOnce();
	});

	it("clearAndStopQueue should set state.lastDownloadedBlock from this.getLastBlock() and clear queue", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		spy(context.stateStore, "getLastDownloadedBlock");
		const clearQueueSpy = spy(blockchain, "clearQueue");
		const setLastDownloadedBlockSpy = spy(context.stateStore, "setLastDownloadedBlock");
		const mockLastBlock = { data: { id: "abcd1234" } };
		stub(context.stateStore, "getLastBlock").returnValue(mockLastBlock);

		blockchain.clearAndStopQueue();

		setLastDownloadedBlockSpy.calledWith(mockLastBlock.data);
		clearQueueSpy.calledOnce();
	});

	it("clearQueue should call queue.clear", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		const clearQueueSpy = spy(blockchain, "clearQueue");

		blockchain.clearQueue();
		clearQueueSpy.calledOnce();
	});

	it("handleIncomingBlock when state is started should dispatch 'NEWBLOCK', BlockEvent.Received and enqueue the block", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const dispatchSpy = spy(blockchain, "dispatch");
		const enqueueBlocksSpy = stub(blockchain, "enqueueBlocks").callsFake(() => undefined);

		const eventDispatcherServiceDispatchSpy = spy(context.eventDispatcherService, "dispatch");
		stub(Crypto.Slots, "getSlotNumber").returnValue(1);
		stub(context.stateStore, "isStarted").returnValue(true);
		stub(context.stateStore, "getLastBlock").returnValue({ data: context.blockData });

		await blockchain.handleIncomingBlock(context.blockData);

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NEWBLOCK");
		eventDispatcherServiceDispatchSpy.calledOnce();
		eventDispatcherServiceDispatchSpy.calledWith(Enums.BlockEvent.Received, context.blockData);
		enqueueBlocksSpy.calledOnce();
		enqueueBlocksSpy.calledWith([context.blockData]);
	});

	it("handleIncomingBlock when state is started should not dispatch anything nor enqueue the block if receivedSlot > currentSlot", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = spy(blockchain, "enqueueBlocks");

		const eventDispatcherServiceDispatchSpy = spy(context.eventDispatcherService, "dispatch");
		stub(context.stateStore, "isStarted").returnValue(true);
		stub(context.stateStore, "getLastBlock").returnValue({ data: context.blockData });
		stub(Crypto.Slots, "getSlotNumber").returnValueNth(0, 1).returnValueNth(1, 2);

		await blockchain.handleIncomingBlock(context.blockData);

		enqueueBlocksSpy.neverCalled();
		eventDispatcherServiceDispatchSpy.neverCalled();
	});

	it("handleIncomingBlock when state is started should handle block from forger if in right slot", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = stub(blockchain, "enqueueBlocks").callsFake(() => undefined);
		const dispatchSpy = spy(blockchain, "dispatch");
		stub(context.stateStore, "isStarted").returnValue(true);
		stub(context.stateStore, "getLastBlock").returnValue({ data: context.blockData });
		stub(Crypto.Slots, "getSlotNumber").returnValue(1);
		stub(Crypto.Slots, "getTimeInMsUntilNextSlot").returnValue(5_000);

		await blockchain.handleIncomingBlock(context.blockData, true);

		enqueueBlocksSpy.calledOnce();
		enqueueBlocksSpy.calledWith([context.blockData]);
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NEWBLOCK");
	});

	for (const fromForger of [true, false]) {
		it("handleIncomingBlock when state is started should not handle block if in wrong slot", async (context) => {
			const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
			const enqueueBlocksSpy = spy(blockchain, "enqueueBlocks");
			const dispatchSpy = spy(blockchain, "dispatch");
			stub(context.stateStore, "isStarted").returnValue(true);
			stub(context.stateStore, "getLastBlock").returnValue({ data: context.blockData });

			stub(Crypto.Slots, "getSlotNumber").returnValueNth(0, 1).returnValueNth(1, 2);
			stub(Crypto.Slots, "getTimeInMsUntilNextSlot").returnValue(5_000);

			await blockchain.handleIncomingBlock(context.blockData, fromForger);

			enqueueBlocksSpy.neverCalled();
			dispatchSpy.neverCalled();
		});
	}

	it("handleIncomingBlock when state is started should not handle block from forger if less than 2 seconds left in slot", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = spy(blockchain, "enqueueBlocks");
		const dispatchSpy = spy(blockchain, "dispatch");

		stub(context.stateStore, "isStarted").returnValue(true);
		stub(context.stateStore, "getLastBlock").returnValue({ data: context.blockData });
		stub(Crypto.Slots, "getSlotNumber").returnValue(1);
		stub(Crypto.Slots, "getTimeInMsUntilNextSlot").returnValue(1_500);

		await blockchain.handleIncomingBlock(context.blockData, true);

		enqueueBlocksSpy.neverCalled();
		dispatchSpy.neverCalled();
	});

	it("handleIncomingBlock when state is started should handle block if not from forger if less than 2 seconds left in slot", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = stub(blockchain, "enqueueBlocks").callsFake(() => undefined);
		const dispatchSpy = spy(blockchain, "dispatch");

		stub(context.stateStore, "isStarted").returnValue(true);
		stub(context.stateStore, "getLastBlock").returnValue({ data: context.blockData });
		stub(Crypto.Slots, "getSlotNumber").returnValue(1);
		stub(Crypto.Slots, "getTimeInMsUntilNextSlot").returnValue(1_500);

		await blockchain.handleIncomingBlock(context.blockData);

		enqueueBlocksSpy.calledOnce();
		enqueueBlocksSpy.calledWith([context.blockData]);
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NEWBLOCK");
	});

	it("handleIncomingBlock when state is not started should dispatch BlockEvent.Disregarded and not enqueue the block", async (context) => {
		stub(Crypto.Slots, "getSlotNumber").returnValue(1);

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = spy(blockchain, "enqueueBlocks");

		const eventDispatcherServiceDispatchSpy = spy(context.eventDispatcherService, "dispatch");
		stub(context.stateStore, "isStarted").returnValue(false);

		await blockchain.handleIncomingBlock(context.blockData);

		eventDispatcherServiceDispatchSpy.calledOnce();
		eventDispatcherServiceDispatchSpy.calledWith(Enums.BlockEvent.Disregarded, context.blockData);
		enqueueBlocksSpy.neverCalled();
	});

	it("handleIncomingBlock should not dispatch anything nor enqueue the block if receivedSlot > currentSlot", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = spy(blockchain, "enqueueBlocks");

		const eventDispatcherServiceDispatchSpy = spy(context.eventDispatcherService, "dispatch");
		stub(Crypto.Slots, "getSlotNumber").returnValueNth(0, 1).returnValueNth(1, 2);

		blockchain.handleIncomingBlock(context.blockData);

		enqueueBlocksSpy.neverCalled();
		eventDispatcherServiceDispatchSpy.neverCalled();
	});

	it("enqueueBlocks should just return if blocks provided are an empty array", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		// @ts-ignore
		const queuePushSpy = spy(blockchain.queue, "push");

		blockchain.enqueueBlocks([]);

		queuePushSpy.neverCalled();
	});

	it("enqueueBlocks should enqueue the blocks", async (context) => {
		const blockData = { height: 30122, numberOfTransactions: 0 } as Interfaces.IBlockData;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({ height: 23111 });
		// @ts-ignore
		const queuePushSpy = spy(blockchain.queue, "push");
		const setBlocksSpy = spy(ProcessBlocksJob.prototype, "setBlocks");

		blockchain.enqueueBlocks([blockData]);

		queuePushSpy.calledOnce();
		setBlocksSpy.calledWith([blockData]);
	});

	it("enqueueBlocks should push a chunk to the queue when currentTransactionsCount >= 150", async (context) => {
		const blockData = { height: 30122, numberOfTransactions: 0 } as Interfaces.IBlockData;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({ height: 23111 });
		// @ts-ignore
		const queuePushSpy = spy(blockchain.queue, "push");
		const setBlocksSpy = spy(ProcessBlocksJob.prototype, "setBlocks");

		const blockWith150Txs = {
			height: blockData.height + 1,
			numberOfTransactions: 150,
		} as Interfaces.IBlockData;

		blockchain.enqueueBlocks([blockWith150Txs, blockData]);

		queuePushSpy.calledTimes(2);
		setBlocksSpy.calledWith([blockWith150Txs]);
		setBlocksSpy.calledWith([blockData]);
	});

	it("enqueueBlocks should push a chunk to the queue when currentBlocksChunk.length >= 100", async (context) => {
		const blockData = { height: 30122, numberOfTransactions: 0 } as Interfaces.IBlockData;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({ height: 23111 });
		// @ts-ignore
		const queuePushSpy = spy(blockchain.queue, "push");
		const setBlocksSpy = spy(ProcessBlocksJob.prototype, "setBlocks");

		const blocksToEnqueue = [];
		for (let i = 0; i < 101; i++) {
			// @ts-ignore
			blocksToEnqueue.push(blockData);
		}
		blockchain.enqueueBlocks(blocksToEnqueue);

		queuePushSpy.calledTimes(2);
		setBlocksSpy.calledWith(blocksToEnqueue.slice(-1));
		setBlocksSpy.calledWith([blockData]);
	});

	it("enqueueBlocks should push a chunk to the queue when hitting new milestone", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({ height: 23111 });
		// @ts-ignore
		const queuePushSpy = spy(blockchain.queue, "push");
		const setBlocksSpy = spy(ProcessBlocksJob.prototype, "setBlocks");

		const blockMilestone = { id: "123", height: 75600 } as Interfaces.IBlockData;
		const blockAfterMilestone = { id: "456", height: 75601 } as Interfaces.IBlockData;
		blockchain.enqueueBlocks([blockMilestone, blockAfterMilestone]);

		queuePushSpy.calledTimes(2);
		setBlocksSpy.calledWith([blockMilestone]);
		setBlocksSpy.calledWith([blockAfterMilestone]);
	});

	it("removeBlocks should call revertBlock and setLastBlock for each block to be removed, and deleteBlocks with all blocks removed", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		const blocksToRemove = [context.blockHeight1, context.blockHeight2, context.blockHeight3];
		const revertBlockSpy = spy(context.databaseInteractions, "revertBlock");
		const deleteBlocksSpy = spy(context.blockRepository, "deleteBlocks");
		const setLastBlockSpy = spy(context.stateStore, "setLastBlock");
		const setLastStoredBlockHeightSpy = spy(context.stateStore, "setLastStoredBlockHeight");
		stub(context.stateStore, "getLastBlock")
			.returnValueNth(0, blocksToRemove[2]) // called in clearAndStopQueue
			.returnValueNth(1, blocksToRemove[2]) // called in removeBlocks
			.returnValueNth(2, blocksToRemove[2]) // called in __removeBlocks
			.returnValueNth(3, blocksToRemove[2]) // called in revertLastBlock
			.returnValueNth(4, blocksToRemove[1]) // called in __removeBlocks
			.returnValueNth(5, blocksToRemove[1]) // called in revertLastBlock
			.returnValueNth(6, context.blockHeight1); // called in validation process
		stub(context.databaseService, "getBlocks").returnValue(
			blocksToRemove.map((b) => ({ ...b.data, transactions: b.transactions })),
		);
		stub(context.databaseService, "getLastBlock").returnValue(context.blockHeight1);

		await blockchain.removeBlocks(2);

		revertBlockSpy.calledTimes(2);
		setLastBlockSpy.calledTimes(2);
		deleteBlocksSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledWith(1);
	});

	it("removeBlocks should default to removing until genesis block when asked to remove more", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		const revertBlockSpy = spy(context.databaseInteractions, "revertBlock");
		const setLastBlockSpy = spy(context.stateStore, "setLastBlock");
		const deleteBlocksSpy = spy(context.blockRepository, "deleteBlocks");
		const setLastStoredBlockHeightSpy = spy(context.stateStore, "setLastStoredBlockHeight");

		const genesisBlock = Networks.testnet.genesisBlock;
		stub(context.stateStore, "getLastBlock")
			.returnValueNth(0, context.blockHeight2) // called in clearAndStopQueue
			.returnValueNth(1, context.blockHeight2) // called in removeBlocks
			.returnValueNth(2, context.blockHeight2) // called in __removeBlocks
			.returnValueNth(3, context.blockHeight2) // called in revertLastBlock
			.returnValueNth(4, { data: genesisBlock });
		stub(context.databaseService, "getBlocks").returnValue([
			genesisBlock,
			{
				...context.blockHeight2.data,
				transactions: context.blockHeight2.transactions,
			},
		]);
		stub(context.databaseService, "getLastBlock").returnValue({ data: genesisBlock });

		await blockchain.removeBlocks(context.blockHeight2.data.height + 10);

		revertBlockSpy.calledOnce();
		setLastBlockSpy.calledOnce();
		setLastBlockSpy.calledWith({ data: genesisBlock });
		deleteBlocksSpy.calledOnce();

		setLastStoredBlockHeightSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledWith(1);
	});

	it("removeBlocks should throw if last database block is not the same as last state block", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		const exitSpy = stub(process, "exit");
		const errorLogSpy = spy(context.logService, "error");
		const warningLogSpy = spy(context.logService, "warning");
		const blocksToRemove = [context.blockHeight1, context.blockHeight2, context.blockHeight3];

		stub(context.stateStore, "getLastBlock")
			.returnValueNth(0, blocksToRemove[2]) // called in clearAndStopQueue
			.returnValueNth(1, blocksToRemove[2]) // called in removeBlocks
			.returnValueNth(2, blocksToRemove[2]) // called in __removeBlocks
			.returnValueNth(3, blocksToRemove[2]) // called in revertLastBlock
			.returnValueNth(4, blocksToRemove[1]) // called in __removeBlocks
			.returnValueNth(5, blocksToRemove[1]) // called in revertLastBlock
			.returnValueNth(6, context.blockHeight1) // called in validation process
			.returnValueNth(7, context.blockHeight1); // called when logging the error
		stub(context.databaseService, "getBlocks").returnValue(
			blocksToRemove.map((b) => ({ ...b.data, transactions: b.transactions })),
		);
		stub(context.databaseService, "getLastBlock").returnValue(context.blockHeight3);

		await blockchain.removeBlocks(2);

		errorLogSpy.calledOnce();
		errorLogSpy.calledWith(
			sinon.match((s) =>
				s.includes(
					`Last stored block (${context.blockHeight3.data.id}) is not the same as last block from state store (${context.blockHeight1.data.id})`,
				),
			),
		);
		warningLogSpy.calledOnce();
		exitSpy.calledOnce();
	});

	it("removeBlocks should log error and exit process, when error is thrown", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		const exitSpy = stub(process, "exit");
		const errorLogSpy = spy(context.logService, "error");
		const warningLogSpy = spy(context.logService, "warning");

		await blockchain.removeBlocks(0);

		errorLogSpy.calledOnce();
		warningLogSpy.calledOnce();
		exitSpy.calledOnce();
	});

	for (const numberOfBlocks of [1, 5, 1329]) {
		it("removeTopBlocks should call deleteTopBlocks with blockRepository and call loadBlocksFromCurrentRound", async (context) => {
			stub(context.databaseService, "getLastBlock").returnValue(context.blockHeight1);
			const deleteTopBlocksSpy = spy(context.blockRepository, "deleteTopBlocks");

			const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

			await blockchain.removeTopBlocks(numberOfBlocks);

			deleteTopBlocksSpy.calledWith(numberOfBlocks);
		});
	}

	it("resetLastDownloadedBlock should set this.state.lastDownloadedBlock = this.getLastBlock().data", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { id: "123", height: 444 } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);
		const setLastDownloadedBlockSpy = spy(context.stateStore, "setLastDownloadedBlock");

		blockchain.resetLastDownloadedBlock();

		setLastDownloadedBlockSpy.calledWith(mockBlock.data);
	});

	it("forceWakeup should clearWakeUpTimeout and dispatch 'WAKEUP", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const dispatchSpy = spy(blockchain, "dispatch");
		const clearWakeUpTimeoutSpy = spy(context.stateStore, "clearWakeUpTimeout");

		blockchain.forceWakeup();

		clearWakeUpTimeoutSpy.calledOnce();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("WAKEUP");
	});

	it("forkBlock should set forkedBlock, clear and stop queue and dispatch 'FORK'", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		const forkedBlock = { data: { id: "1234", height: 8877 } };
		const numberOfBlocksToRollback = 34;
		const clearAndStopQueueSpy = spy(blockchain, "clearAndStopQueue");
		const dispatchSpy = spy(blockchain, "dispatch");
		const setForkedBlockSpy = spy(context.stateStore, "setForkedBlock");
		const setNumberOfBlocksToRollbackSpy = spy(context.stateStore, "setNumberOfBlocksToRollback");
		const mockBlock = { data: { id: "123", height: 444 } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		blockchain.forkBlock(forkedBlock as Interfaces.IBlock, numberOfBlocksToRollback);

		setForkedBlockSpy.calledWith(forkedBlock);
		setNumberOfBlocksToRollbackSpy.calledWith(numberOfBlocksToRollback);
		clearAndStopQueueSpy.calledOnce();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("FORK");
	});

	it("isSynced should return true if we have no peer", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		stub(context.peerRepository, "hasPeers").returnValue(false);

		assert.true(blockchain.isSynced());
	});

	it("isSynced should return true if last block is less than 3 blocktimes away from current slot time", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		stub(context.peerRepository, "hasPeers").returnValue(true);
		const mockBlock = { data: { id: "123", height: 444, timestamp: Crypto.Slots.getTime() - 16 } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		assert.true(blockchain.isSynced());
	});

	it("isSynced should return false if last block is more than 3 blocktimes away from current slot time", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		stub(context.peerRepository, "hasPeers").returnValue(true);
		const mockBlock = { data: { id: "123", height: 444, timestamp: Crypto.Slots.getTime() - 25 } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		assert.false(blockchain.isSynced());
	});

	it("getLastBlock should return the last block from state", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { id: "123", height: 444 } };
		const getLastBlockStub = stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		assert.equal(blockchain.getLastBlock(), mockBlock);
		getLastBlockStub.calledOnce();
	});

	it("getLastHeight should return the last height using getLastBlock", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { id: "123", height: 444 } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);
		const spyGetLastBlock = spy(blockchain, "getLastBlock");

		assert.equal(blockchain.getLastHeight(), mockBlock.data.height);
		spyGetLastBlock.calledOnce();
	});

	it("getLastDownloadedBlock should return state.lastDownloadedBlock if it is defined", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { id: "123", height: 444 } };
		stub(context.stateStore, "getLastDownloadedBlock").returnValue(mockBlock.data);

		assert.equal(blockchain.getLastDownloadedBlock(), mockBlock.data);
	});

	it("getLastDownloadedBlock should return getLastBlock().data if state.lastDownloadedBlock is undefined", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { id: "123", height: 444 } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		const getLastBlockSpy = spy(blockchain, "getLastBlock");

		assert.equal(blockchain.getLastDownloadedBlock(), mockBlock.data);
		getLastBlockSpy.calledOnce();
	});

	for (const blockPing of [undefined, { block: { data: { id: "123", height: 444 }, count: 3 } }]) {
		it("getBlockPing should return the value of state.blockPing", (context) => {
			const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

			stub(context.stateStore, "getBlockPing").returnValue(blockPing);

			assert.equal(blockchain.getBlockPing(), blockPing);
		});
	}

	it("pingBlock should call state.pingBlock", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const pingBlockSpy = spy(context.stateStore, "pingBlock");

		const incomingBlock = { id: "123", height: 444 };
		blockchain.pingBlock(incomingBlock as Interfaces.IBlockData);

		pingBlockSpy.calledOnce();
		pingBlockSpy.calledWith(incomingBlock);
	});

	it("pushPingBlock should call state.pushPingBlock", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const pushPingBlockSpy = spy(context.stateStore, "pushPingBlock");

		const incomingBlock = { id: "123", height: 444 };
		const fromForger = true;
		blockchain.pushPingBlock(incomingBlock as Interfaces.IBlockData, fromForger);

		pushPingBlockSpy.calledOnce();
		pushPingBlockSpy.calledWith(incomingBlock, fromForger);
	});

	it("pushPingBlock should call state.pushPingBlock with fromForger=false if not specified", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const pushPingBlockSpy = spy(context.stateStore, "pushPingBlock");

		const incomingBlock = { id: "123", height: 444 };
		blockchain.pushPingBlock(incomingBlock as Interfaces.IBlockData);

		pushPingBlockSpy.calledOnce();
		pushPingBlockSpy.calledWith(incomingBlock, false);
	});

	it("checkMissingBlocks when missedBlocks passes the threshold and Math.random()<=0.8, should checkNetworkHealth", async (context) => {
		const threshold = Managers.configManager.getMilestone().activeDelegates / 3 - 1;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		stub(Math, "random").returnValue(0.7);

		const checkNetworkHealthStub = stub(context.peerNetworkMonitor, "checkNetworkHealth").returnValue({});
		for (let i = 1; i < threshold; i++) {
			await blockchain.checkMissingBlocks();
			checkNetworkHealthStub.neverCalled();
		}

		await blockchain.checkMissingBlocks();
		checkNetworkHealthStub.calledOnce();
	});

	it("checkMissingBlocks should skip checkNetworkHealth if last check occurs in past 10 minutes", async (context) => {
		const threshold = Managers.configManager.getMilestone().activeDelegates / 3 - 1;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		stub(Math, "random").returnValue(0.7);

		const checkNetworkHealthStub = stub(context.peerNetworkMonitor, "checkNetworkHealth").returnValue({});
		// @ts-ignore
		blockchain.missedBlocks = threshold;
		// @ts-ignore
		blockchain.lastCheckNetworkHealthTs = Date.now();

		await blockchain.checkMissingBlocks();
		checkNetworkHealthStub.neverCalled();

		// @ts-ignore
		blockchain.missedBlocks = threshold;
		// @ts-ignore
		blockchain.lastCheckNetworkHealthTs = Date.now() - 11 * 60 * 1000;
		await blockchain.checkMissingBlocks();
		checkNetworkHealthStub.calledOnce();
	});

	it("checkMissingBlocks when missedBlocks passes the threshold and Math.random()<=0.8, should checkNetworkHealth and dispatch FORK if forked", async (context) => {
		const threshold = Managers.configManager.getMilestone().activeDelegates / 3 - 1;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		stub(Math, "random").returnValue(0.7);

		const dispatchSpy = spy(blockchain, "dispatch");

		const checkNetworkHealthStub = stub(context.peerNetworkMonitor, "checkNetworkHealth").returnValue({
			forked: true,
		});
		for (let i = 1; i < threshold; i++) {
			await blockchain.checkMissingBlocks();
			checkNetworkHealthStub.neverCalled();
			dispatchSpy.neverCalled();
		}

		await blockchain.checkMissingBlocks();
		checkNetworkHealthStub.calledOnce();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("FORK");
	});

	it("checkMissingBlocks when missedBlocks passes the threshold and Math.random()>0.8, should do nothing", async (context) => {
		const threshold = Managers.configManager.getMilestone().activeDelegates / 3 - 1;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		stub(Math, "random").returnValue(0.9);

		const checkNetworkHealthStub = stub(context.peerNetworkMonitor, "checkNetworkHealth").returnValue({});
		for (let i = 1; i < threshold + 10; i++) {
			await blockchain.checkMissingBlocks();
			checkNetworkHealthStub.neverCalled();
		}
	});
});

import { Contracts, Identifiers } from "@arkecosystem/core-contracts";
import { Enums, Services } from "@arkecosystem/core-kernel";
import { MemoryQueue } from "@arkecosystem/core-kernel/distribution/services/queue/drivers/memory";
import { Actions } from "@arkecosystem/core-state";
import { BigNumber } from "@arkecosystem/utils";
import delay from "delay";
import sinon from "sinon";

import { describe, Sandbox } from "../../core-test-framework";
import { ProcessBlockAction } from "./actions";
import { Blockchain } from "./blockchain";
import { ProcessBlocksJob } from "./process-blocks-job";

describe<{
	sandbox: Sandbox;
	pluginConfiguration: any;
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
	configuration: any;
	slots: any;
	queue: any;
	blockData: Contracts.Crypto.IBlockData;
	blockHeight1: any;
	blockHeight2: any;
	blockHeight3: any;
}>("Blockchain", ({ assert, beforeEach, it, spy, spyFn, stub }) => {
	beforeEach((context) => {
		context.pluginConfiguration = {
			getOptional: (key, defaultValue) => defaultValue,
		};
		context.logService = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		};
		context.stateStore = {
			blockPing: undefined,
			clearWakeUpTimeout: () => {},
			// getGenesisBlock: () => ({ data: Networks.testnet.genesisBlock }),
			getLastDownloadedBlock: () => {},
			getMaxLastBlocks: () => 200,
			getNetworkStart: () => false,
			getLastBlock: () => {},
			getNumberOfBlocksToRollback: () => 0,
			isStarted: () => {},
			pushPingBlock: () => {},
			reset: () => {},
			getBlockPing: () => {},
			setForkedBlock: () => {},
			pingBlock: () => {},
			wakeUpTimeout: undefined,
			setLastBlock: () => {},
			setLastDownloadedBlock: () => {},
			setLastStoredBlockHeight: () => {},
			setNetworkStart: () => {},
			setNumberOfBlocksToRollback: () => {},
			setWakeUpTimeout: () => {},
		};
		context.databaseService = {
			deleteRound: () => {},
			getBlocks: () => {},
			getLastBlock: () => {},
			revertBlock: () => {},
		};
		context.blockRepository = {
			deleteBlocks: () => {},
			deleteTopBlocks: () => {},
			saveBlocks: () => {},
		};
		context.transactionPoolService = {
			readdTransactions: () => {},
		};
		context.stateMachine = {
			transition: () => {},
		};
		context.eventDispatcherService = {
			dispatch: () => {},
			listen: () => {},
		};
		context.peerNetworkMonitor = {
			broadcastBlock: () => {},
			checkNetworkHealth: () => {},
			cleansePeers: () => {},
		};
		context.peerRepository = {
			hasPeers: () => {},
		};
		context.blockProcessor = {
			process: () => {},
		};
		context.databaseInteractions = {
			deleteRound: () => {},
			getActiveDelegates: () => [],
			getLastBlock: () => {},
			getTopBlocks: () => {},
			restoreCurrentRound: () => {},
			revertBlock: () => {},
		};

		context.configuration = {
			getMilestone: () => {},
			getMilestones: () => {},
		};

		context.slots = {
			getSlotNumber: () => {},
			getTimeInMsUntilNextSlot: () => {},
			getTime: () => 0,
		};

		context.queue = {
			on: () => {},
			stop: () => {},
			pause: () => {},
			drain: () => {},
			clear: () => {},
			push: () => {},
			resume: () => {},
		};

		context.blockData = { height: 30_122 } as Contracts.Crypto.IBlockData;

		context.blockHeight1 = {
			data: {
				height: 1,
				id: "17184958558311101492",
				timestamp: 0,
				version: 0,
			},
			transactions: [],
		};
		context.blockHeight2 = {
			data: {
				height: 2,
				generatorPublicKey: "026c598170201caf0357f202ff14f365a3b09322071e347873869f58d776bfc565",
				id: "17882607875259085966",
				blockSignature:
					"3045022100e7385c6ea42bd950f7f6ab8c8619cf2f66a41d8f8f185b0bc99af032cb25f30d02200b6210176a6cedfdcbe483167fd91c21d740e0e4011d24d679c601fdd46b0de9",
				numberOfTransactions: 0,
				createdAt: "2018-09-11T16:48:50.550Z",
				payloadLength: 0,
				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				previousBlock: "17184958558311101492",
				reward: BigNumber.make("0"),
				timestamp: 46_583_330,
				totalAmount: BigNumber.make("0"),
				version: 0,
				totalFee: BigNumber.make("0"),
			},
			transactions: [],
		};
		context.blockHeight3 = {
			data: {
				height: 3,
				generatorPublicKey: "038082dad560a22ea003022015e3136b21ef1ffd9f2fd50049026cbe8e2258ca17",
				id: "7242383292164246617",
				blockSignature:
					"304402204087bb1d2c82b9178b02b9b3f285de260cdf0778643064fe6c7aef27321d49520220594c57009c1fca543350126d277c6adeb674c00685a464c3e4bf0d634dc37e39",
				numberOfTransactions: 0,
				createdAt: "2018-09-11T16:48:58.431Z",
				payloadLength: 0,
				payloadHash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
				previousBlock: "17882607875259085966",
				reward: BigNumber.make("0"),
				timestamp: 46_583_338,
				totalAmount: BigNumber.make("0"),
				version: 0,
				totalFee: BigNumber.make("0"),
			},
			transactions: [],
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.PluginConfiguration).toConstantValue(context.pluginConfiguration);
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logService);
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
		context.sandbox.app.bind(Identifiers.DatabaseInteraction).toConstantValue(context.databaseInteractions);
		context.sandbox.app.bind(Identifiers.Database.BlockStorage).toConstantValue(context.blockRepository);
		context.sandbox.app.bind(Identifiers.TransactionPoolService).toConstantValue(context.transactionPoolService);
		context.sandbox.app.bind(Identifiers.StateMachine).toConstantValue(context.stateMachine);
		context.sandbox.app.bind(Identifiers.EventDispatcherService).toConstantValue(context.eventDispatcherService);
		context.sandbox.app.bind(Identifiers.PeerNetworkMonitor).toConstantValue(context.peerNetworkMonitor);
		context.sandbox.app.bind(Identifiers.PeerRepository).toConstantValue(context.peerRepository);
		context.sandbox.app.bind(Identifiers.BlockchainService).to(Blockchain).inSingletonScope();
		context.sandbox.app.bind(Identifiers.BlockProcessor).toConstantValue(context.blockProcessor);
		context.sandbox.app.bind(Identifiers.Database.TransactionStorage).toConstantValue({});
		context.sandbox.app.bind(Identifiers.WalletRepository).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Block.Factory).toConstantValue({});
		context.sandbox.app.bind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({});

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.sandbox.app.bind(Identifiers.Cryptography.Time.Slots).toConstantValue(context.slots);

		context.sandbox.app.bind(Identifiers.TriggerService).to(Services.Triggers.Triggers).inSingletonScope();
		context.sandbox.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("processBlock", new ProcessBlockAction());

		context.sandbox.app
			.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
			.bind("getActiveDelegates", new Actions.GetActiveValidatorsAction(context.sandbox.app));

		context.sandbox.app.bind(Identifiers.QueueFactory).toFactory(() => () => {
			return context.queue;
		});

		const getTimeStampForBlock = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		// const spyblockTimeLookup = stub(AppUtils.forgingInfoCalculator, "getBlockTimeLookup");
		// spyblockTimeLookup.resolvedValue(getTimeStampForBlock);

		// Managers.configManager.setFromPreset("testnet");
	});

	it("initialize should log a warning if networkStart option is provided", (context) => {
		stub(context.pluginConfiguration, "getOptional").returnValueOnce(true);
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

		assert.equal(blockchain.getQueue(), context.queue);
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
		const bootResultEnvironment = await blockchain.boot();

		assert.true(bootResultEnvironment);
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
			resolved.call();
		};
		checkBootResolved();

		// will not resolve after 200 ms while context.stateStore.started is false
		await delay(200);
		resolved.neverCalled();

		// will resolve after 1 second when context.stateStore.started is true
		isStartedStub.restore();
		stub(context.stateStore, "isStarted").returnValue(true);
		await delay(1100);

		resolved.calledOnce();
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
		const stopQueueSpy = stub(context.queue, "stop");

		// @ts-ignore
		blockchain.stopped = true;

		await blockchain.initialize();
		await blockchain.dispose();

		dispatchSpy.calledWith("STOP");
		stopQueueSpy.calledOnce();
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
		const enqueueBlocksSpy = stub(blockchain, "enqueueBlocks").callsFake(() => {});

		const eventDispatcherServiceDispatchSpy = spy(context.eventDispatcherService, "dispatch");
		stub(context.slots, "getSlotNumber").returnValue(1);
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
		stub(context.slots, "getSlotNumber").returnValueNth(0, 1).returnValueNth(1, 2);

		await blockchain.handleIncomingBlock(context.blockData);

		enqueueBlocksSpy.neverCalled();
		eventDispatcherServiceDispatchSpy.neverCalled();
	});

	it("handleIncomingBlock when state is started should handle block from forger if in right slot", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = stub(blockchain, "enqueueBlocks").callsFake(() => {});
		const dispatchSpy = spy(blockchain, "dispatch");
		stub(context.stateStore, "isStarted").returnValue(true);
		stub(context.stateStore, "getLastBlock").returnValue({ data: context.blockData });
		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(context.slots, "getTimeInMsUntilNextSlot").returnValue(5000);

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

			stub(context.slots, "getSlotNumber").returnValueNth(0, 1).returnValueNth(1, 2);
			stub(context.slots, "getTimeInMsUntilNextSlot").returnValue(5000);

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
		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(context.slots, "getTimeInMsUntilNextSlot").returnValue(1500);

		await blockchain.handleIncomingBlock(context.blockData, true);

		enqueueBlocksSpy.neverCalled();
		dispatchSpy.neverCalled();
	});

	it("handleIncomingBlock when state is started should handle block if not from forger if less than 2 seconds left in slot", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = stub(blockchain, "enqueueBlocks").callsFake(() => {});
		const dispatchSpy = spy(blockchain, "dispatch");

		stub(context.stateStore, "isStarted").returnValue(true);
		stub(context.stateStore, "getLastBlock").returnValue({ data: context.blockData });
		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(context.slots, "getTimeInMsUntilNextSlot").returnValue(1500);

		await blockchain.handleIncomingBlock(context.blockData);

		enqueueBlocksSpy.calledOnce();
		enqueueBlocksSpy.calledWith([context.blockData]);
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NEWBLOCK");
	});

	it("handleIncomingBlock when state is not started should dispatch BlockEvent.Disregarded and not enqueue the block", async (context) => {
		stub(context.slots, "getSlotNumber").returnValue(1);

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = spy(blockchain, "enqueueBlocks");

		const eventDispatcherServiceDispatchSpy = spy(context.eventDispatcherService, "dispatch");
		stub(context.stateStore, "isStarted").returnValue(false);

		await blockchain.handleIncomingBlock(context.blockData);

		eventDispatcherServiceDispatchSpy.calledOnce();
		eventDispatcherServiceDispatchSpy.calledWith(Enums.BlockEvent.Disregarded, context.blockData);
		enqueueBlocksSpy.neverCalled();
	});

	it("handleIncomingBlock should not dispatch anything nor enqueue the block if receivedSlot > currentSlot", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const enqueueBlocksSpy = spy(blockchain, "enqueueBlocks");

		const eventDispatcherServiceDispatchSpy = spy(context.eventDispatcherService, "dispatch");
		stub(context.slots, "getSlotNumber").returnValueNth(0, 1).returnValueNth(1, 2);

		await blockchain.handleIncomingBlock(context.blockData);

		enqueueBlocksSpy.neverCalled();
		eventDispatcherServiceDispatchSpy.neverCalled();
	});

	it("enqueueBlocks should just return if blocks provided are an empty array", async (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		// @ts-ignore
		const queuePushSpy = spy(context.queue, "push");

		blockchain.enqueueBlocks([]);

		queuePushSpy.neverCalled();
	});

	it("enqueueBlocks should enqueue the blocks", async (context) => {
		stub(context.configuration, "getMilestones").returnValue([]);
		const blockData = { height: 30_122, numberOfTransactions: 0 } as Contracts.Crypto.IBlockData;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({ height: 23_111 });
		const queuePushSpy = stub(context.queue, "push");
		const setBlocksSpy = stub(ProcessBlocksJob.prototype, "setBlocks");

		blockchain.enqueueBlocks([blockData]);

		queuePushSpy.calledOnce();
		setBlocksSpy.calledWith([blockData]);
	});

	it("enqueueBlocks should push a chunk to the queue when currentTransactionsCount >= 150", async (context) => {
		stub(context.configuration, "getMilestones").returnValue([]);
		const blockData = { height: 30_122, numberOfTransactions: 0 } as Contracts.Crypto.IBlockData;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({ height: 23_111 });
		const queuePushSpy = spy(context.queue, "push");
		const setBlocksSpy = spy(ProcessBlocksJob.prototype, "setBlocks");

		const blockWith150Txs = {
			height: blockData.height + 1,
			numberOfTransactions: 150,
		} as Contracts.Crypto.IBlockData;

		blockchain.enqueueBlocks([blockWith150Txs, blockData]);

		queuePushSpy.calledTimes(2);
		setBlocksSpy.calledWith([blockWith150Txs]);
		setBlocksSpy.calledWith([blockData]);
	});

	it("enqueueBlocks should push a chunk to the queue when currentBlocksChunk.length >= 100", async (context) => {
		stub(context.configuration, "getMilestones").returnValue([]);
		const blockData = { height: 30_122, numberOfTransactions: 0 } as Contracts.Crypto.IBlockData;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({ height: 23_111 });
		const queuePushSpy = spy(context.queue, "push");
		const setBlocksSpy = spy(ProcessBlocksJob.prototype, "setBlocks");

		const blocksToEnqueue = [];
		for (let index = 0; index < 101; index++) {
			// @ts-ignore
			blocksToEnqueue.push(blockData);
		}
		blockchain.enqueueBlocks(blocksToEnqueue);

		queuePushSpy.calledTimes(2);
		setBlocksSpy.calledWith(blocksToEnqueue.slice(-1));
		setBlocksSpy.calledWith([blockData]);
	});

	it("enqueueBlocks should push a chunk to the queue when hitting new milestone", async (context) => {
		stub(context.configuration, "getMilestones").returnValue([
			{
				height: 75_600,
			},
		]);
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		await blockchain.initialize();

		stub(context.stateStore, "getLastDownloadedBlock").returnValue({ height: 23_111 });
		const queuePushSpy = spy(context.queue, "push");
		const setBlocksSpy = spy(ProcessBlocksJob.prototype, "setBlocks");

		const blockMilestone = { height: 75_600, id: "123" } as Contracts.Crypto.IBlockData;
		const blockAfterMilestone = { height: 75_601, id: "456" } as Contracts.Crypto.IBlockData;
		blockchain.enqueueBlocks([blockMilestone, blockAfterMilestone]);

		queuePushSpy.calledTimes(2);
		setBlocksSpy.calledWith([blockMilestone]);
		setBlocksSpy.calledWith([blockAfterMilestone]);
	});

	// it("removeBlocks should throw if last database block is not the same as last state block", async (context) => {
	// 	const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
	// 	await blockchain.initialize();

	// 	const exitSpy = stub(process, "exit");
	// 	const errorLogSpy = spy(context.logService, "error");
	// 	const warningLogSpy = spy(context.logService, "warning");
	// 	const blocksToRemove = [context.blockHeight1, context.blockHeight2, context.blockHeight3];

	// 	stub(context.stateStore, "getLastBlock")
	// 		.returnValueNth(0, blocksToRemove[2]) // called in clearAndStopQueue
	// 		.returnValueNth(1, blocksToRemove[2]) // called in removeBlocks
	// 		.returnValueNth(2, blocksToRemove[2]) // called in __removeBlocks
	// 		.returnValueNth(3, blocksToRemove[2]) // called in revertLastBlock
	// 		.returnValueNth(4, blocksToRemove[1]) // called in __removeBlocks
	// 		.returnValueNth(5, blocksToRemove[1]) // called in revertLastBlock
	// 		.returnValueNth(6, context.blockHeight1) // called in validation process
	// 		.returnValueNth(7, context.blockHeight1); // called when logging the error
	// 	stub(context.databaseService, "getBlocks").returnValue(
	// 		blocksToRemove.map((b) => ({ ...b.data, transactions: b.transactions })),
	// 	);
	// 	stub(context.databaseService, "getLastBlock").returnValue(context.blockHeight3);

	// 	await blockchain.removeBlocks(2);

	// 	errorLogSpy.calledOnce();
	// 	errorLogSpy.calledWith(
	// 		sinon.match((s) =>
	// 			s.includes(
	// 				`Last stored block (${context.blockHeight3.data.id}) is not the same as last block from state store (${context.blockHeight1.data.id})`,
	// 			),
	// 		),
	// 	);
	// 	warningLogSpy.calledOnce();
	// 	exitSpy.calledOnce();
	// });

	// it("removeBlocks should log error and exit process, when error is thrown", async (context) => {
	// 	const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
	// 	await blockchain.initialize();

	// 	const exitSpy = stub(process, "exit");
	// 	const errorLogSpy = spy(context.logService, "error");
	// 	const warningLogSpy = spy(context.logService, "warning");

	// 	await blockchain.removeBlocks(0);

	// 	errorLogSpy.calledOnce();
	// 	warningLogSpy.calledOnce();
	// 	exitSpy.calledOnce();
	// });

	// for (const numberOfBlocks of [1, 5, 1329]) {
	// 	it("removeTopBlocks should call deleteTopBlocks with blockRepository and call loadBlocksFromCurrentRound", async (context) => {
	// 		stub(context.databaseService, "getLastBlock").returnValue(context.blockHeight1);
	// 		const deleteTopBlocksSpy = spy(context.blockRepository, "deleteTopBlocks");

	// 		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

	// 		await blockchain.removeTopBlocks(numberOfBlocks);

	// 		deleteTopBlocksSpy.calledWith(numberOfBlocks);
	// 	});
	// }

	it("resetLastDownloadedBlock should set this.state.lastDownloadedBlock = this.getLastBlock().data", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { height: 444, id: "123" } };
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

		const forkedBlock = { data: { height: 8877, id: "1234" } };
		const numberOfBlocksToRollback = 34;
		const clearAndStopQueueSpy = spy(blockchain, "clearAndStopQueue");
		const dispatchSpy = spy(blockchain, "dispatch");
		const setForkedBlockSpy = spy(context.stateStore, "setForkedBlock");
		const setNumberOfBlocksToRollbackSpy = spy(context.stateStore, "setNumberOfBlocksToRollback");
		const mockBlock = { data: { height: 444, id: "123" } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		blockchain.forkBlock(forkedBlock as Contracts.Crypto.IBlock, numberOfBlocksToRollback);

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
		stub(context.slots, "getTime").returnValue(100);
		stub(context.configuration, "getMilestone").returnValue({
			blockTime: 8,
		});

		stub(context.peerRepository, "hasPeers").returnValue(true);
		const mockBlock = { data: { height: 444, id: "123", timestamp: context.slots.getTime() - 16 } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		assert.true(blockchain.isSynced());
	});

	it("isSynced should return false if last block is more than 3 blocktimes away from current slot time", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		stub(context.slots, "getTime").returnValue(100);
		stub(context.configuration, "getMilestone").returnValue({
			blockTime: 8,
		});

		stub(context.peerRepository, "hasPeers").returnValue(true);
		const mockBlock = { data: { height: 444, id: "123", timestamp: context.slots.getTime() - 25 } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		assert.false(blockchain.isSynced());
	});

	it("getLastBlock should return the last block from state", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { height: 444, id: "123" } };
		const getLastBlockStub = stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		assert.equal(blockchain.getLastBlock(), mockBlock);
		getLastBlockStub.calledOnce();
	});

	it("getLastHeight should return the last height using getLastBlock", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { height: 444, id: "123" } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);
		const spyGetLastBlock = spy(blockchain, "getLastBlock");

		assert.equal(blockchain.getLastHeight(), mockBlock.data.height);
		spyGetLastBlock.calledOnce();
	});

	it("getLastDownloadedBlock should return state.lastDownloadedBlock if it is defined", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { height: 444, id: "123" } };
		stub(context.stateStore, "getLastDownloadedBlock").returnValue(mockBlock.data);

		assert.equal(blockchain.getLastDownloadedBlock(), mockBlock.data);
	});

	it("getLastDownloadedBlock should return getLastBlock().data if state.lastDownloadedBlock is undefined", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const mockBlock = { data: { height: 444, id: "123" } };
		stub(context.stateStore, "getLastBlock").returnValue(mockBlock);

		const getLastBlockSpy = spy(blockchain, "getLastBlock");

		assert.equal(blockchain.getLastDownloadedBlock(), mockBlock.data);
		getLastBlockSpy.calledOnce();
	});

	for (const blockPing of [undefined, { block: { count: 3, data: { height: 444, id: "123" } } }]) {
		it("getBlockPing should return the value of state.blockPing", (context) => {
			const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

			stub(context.stateStore, "getBlockPing").returnValue(blockPing);

			assert.equal(blockchain.getBlockPing(), blockPing);
		});
	}

	it("pingBlock should call state.pingBlock", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const pingBlockSpy = spy(context.stateStore, "pingBlock");

		const incomingBlock = { height: 444, id: "123" };
		blockchain.pingBlock(incomingBlock as Contracts.Crypto.IBlockData);

		pingBlockSpy.calledOnce();
		pingBlockSpy.calledWith(incomingBlock);
	});

	it("pushPingBlock should call state.pushPingBlock", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const pushPingBlockSpy = spy(context.stateStore, "pushPingBlock");

		const incomingBlock = { height: 444, id: "123" };
		const fromForger = true;
		blockchain.pushPingBlock(incomingBlock as Contracts.Crypto.IBlockData, fromForger);

		pushPingBlockSpy.calledOnce();
		pushPingBlockSpy.calledWith(incomingBlock, fromForger);
	});

	it("pushPingBlock should call state.pushPingBlock with fromForger=false if not specified", (context) => {
		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		const pushPingBlockSpy = spy(context.stateStore, "pushPingBlock");

		const incomingBlock = { height: 444, id: "123" };
		blockchain.pushPingBlock(incomingBlock as Contracts.Crypto.IBlockData);

		pushPingBlockSpy.calledOnce();
		pushPingBlockSpy.calledWith(incomingBlock, false);
	});

	it("checkMissingBlocks when missedBlocks passes the threshold and Math.random()<=0.8, should checkNetworkHealth", async (context) => {
		stub(context.configuration, "getMilestone").returnValue({
			activeValidators: 51,
		});
		const threshold = context.configuration.getMilestone().activeValidators / 3 - 1;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);

		const checkNetworkHealthStub = stub(context.peerNetworkMonitor, "checkNetworkHealth").returnValue({});
		for (let index = 1; index < threshold; index++) {
			await blockchain.checkMissingBlocks();
			checkNetworkHealthStub.neverCalled();
		}

		await blockchain.checkMissingBlocks();
		checkNetworkHealthStub.calledOnce();
	});

	it("checkMissingBlocks should skip checkNetworkHealth if last check occurs in past 10 minutes", async (context) => {
		stub(context.configuration, "getMilestone").returnValue({
			activeValidators: 9,
		});
		const threshold = context.configuration.getMilestone().activeValidators / 3 - 1;

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
		stub(context.configuration, "getMilestone").returnValue({
			activeValidators: 51,
		});
		const threshold = context.configuration.getMilestone().activeValidators / 3 - 1;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		stub(Math, "random").returnValue(0.7);

		const dispatchSpy = spy(blockchain, "dispatch");

		const checkNetworkHealthStub = stub(context.peerNetworkMonitor, "checkNetworkHealth").returnValue({
			forked: true,
		});
		for (let index = 1; index < threshold; index++) {
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
		stub(context.configuration, "getMilestone").returnValue({
			activeValidators: 51,
		});
		const threshold = context.configuration.getMilestone().activeValidators / 3 - 1;

		const blockchain = context.sandbox.app.resolve<Blockchain>(Blockchain);
		stub(Math, "random").returnValue(0.9);

		const checkNetworkHealthStub = stub(context.peerNetworkMonitor, "checkNetworkHealth").returnValue({});
		for (let index = 1; index < threshold + 10; index++) {
			await blockchain.checkMissingBlocks();
			checkNetworkHealthStub.neverCalled();
		}
	});
});

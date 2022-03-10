import { Container, Services } from "@arkecosystem/core-kernel";
import { Crypto, Interfaces, Networks } from "@arkecosystem/crypto";
import { describe, Sandbox } from "../../core-test-framework";

import { ProcessBlockAction } from "./actions";
import { ProcessBlocksJob } from "./process-blocks-job";
import { BlockProcessorResult } from "./processor";

import { Blocks } from "../test/fixtures";

describe<{
	sandbox: Sandbox;
	processBlocksJob: ProcessBlocksJob;

	lastBlock: Interfaces.IBlockData;
	currentBlock: Interfaces.IBlockData;
}>("ProcessBlocksJob", ({ assert, beforeEach, it, spy, spyFn, stub, stubFn }) => {
	const blockchainService: any = {
		getLastBlock: () => undefined,
		clearQueue: () => undefined,
		resetLastDownloadedBlock: () => undefined,
		forkBlock: () => undefined,
	};
	const stateMachine: any = {
		getState: () => undefined,
	};
	const blockProcessor: any = {
		process: () => undefined,
		validateGenerator: () => undefined,
	};
	const stateStore: any = {
		setLastStoredBlockHeight: () => undefined,
		isStarted: () => undefined,
		// stateStore: () => undefined,
		getLastBlock: () => undefined,
		setLastBlock: () => undefined,
	};
	const databaseService: any = {
		getLastBlock: () => undefined,
		deleteRound: () => undefined,
	};
	const databaseBlockRepository: any = {
		saveBlocks: () => undefined,
	};
	const databaseInteraction: any = {
		loadBlocksFromCurrentRound: () => undefined,
		restoreCurrentRound: () => undefined,
	};
	const peerNetworkMonitor: any = {
		broadcastBlock: () => undefined,
	};
	const logService: any = {
		debug: spyFn(),
		warning: spyFn(),
		error: spyFn(),
		info: spyFn(),
	};

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Container.Identifiers.BlockchainService).toConstantValue(blockchainService);
		context.sandbox.app.bind(Container.Identifiers.StateMachine).toConstantValue(stateMachine);
		context.sandbox.app.bind(Container.Identifiers.BlockProcessor).toConstantValue(blockProcessor);
		context.sandbox.app.bind(Container.Identifiers.StateStore).toConstantValue(stateStore);
		context.sandbox.app.bind(Container.Identifiers.DatabaseService).toConstantValue(databaseService);
		context.sandbox.app
			.bind(Container.Identifiers.DatabaseBlockRepository)
			.toConstantValue(databaseBlockRepository);
		context.sandbox.app.bind(Container.Identifiers.DatabaseInteraction).toConstantValue(databaseInteraction);
		context.sandbox.app.bind(Container.Identifiers.PeerNetworkMonitor).toConstantValue(peerNetworkMonitor);
		context.sandbox.app.bind(Container.Identifiers.LogService).toConstantValue(logService);

		context.sandbox.app
			.bind(Container.Identifiers.TriggerService)
			.to(Services.Triggers.Triggers)
			.inSingletonScope();
		context.sandbox.app
			.get<Services.Triggers.Triggers>(Container.Identifiers.TriggerService)
			.bind("processBlock", new ProcessBlockAction());

		context.processBlocksJob = context.sandbox.app.resolve(ProcessBlocksJob);

		context.lastBlock = { ...Blocks.block2.data, transactions: [] };
		context.currentBlock = { ...Blocks.block3.data, transactions: [] };
	});

	// afterEach(() => {
	// 	jest.clearAllMocks();
	// });

	it("should set and get blocks", async (context) => {
		const blocks = [
			{ ...Blocks.block2.data, transactions: [] },
			{ ...Blocks.block3.data, transactions: [] },
		] as Interfaces.IBlockData[];

		context.processBlocksJob.setBlocks(blocks);

		assert.equal(context.processBlocksJob.getBlocks(), blocks);
	});

	it("should skip processing if blocks are not set", async (context) => {
		await assert.resolves(() => context.processBlocksJob.handle());
	});

	it("should process a new chained block", async (context) => {
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock }); // TODO: Use stateStore
		stub(blockProcessor, "process").returnValue(BlockProcessorResult.Accepted);
		stub(blockProcessor, "validateGenerator").returnValue(BlockProcessorResult.Accepted);
		stub(stateStore, "isStarted").returnValue(true);

		const saveBlocksSpy = spy(databaseBlockRepository, "saveBlocks");
		const setLastStoredBlockHeightSpy = spy(stateStore, "setLastStoredBlockHeight");

		context.processBlocksJob.setBlocks([context.currentBlock]);
		await context.processBlocksJob.handle();

		saveBlocksSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledWith(context.currentBlock.height);
	});

	it("should process a valid block already known", async (context) => {
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock });
		const clearQueueSpy = spy(blockchainService, "clearQueue");
		const resetLastDownloadedBlockSpy = spy(blockchainService, "resetLastDownloadedBlock");

		context.processBlocksJob.setBlocks([context.lastBlock]);
		await context.processBlocksJob.handle();

		clearQueueSpy.calledOnce();
		resetLastDownloadedBlockSpy.calledOnce();
	});

	it("should not process the remaining blocks if one is not accepted (BlockProcessorResult.Rollback)", async (context) => {
		stub(blockchainService, "getLastBlock").returnValue({ data: Networks.testnet.genesisBlock });
		const processStub = stub(blockProcessor, "process").returnValue(BlockProcessorResult.Rollback);
		const forkBlockSpy = spy(blockchainService, "forkBlock");

		context.processBlocksJob.setBlocks([context.lastBlock, context.currentBlock]);
		await context.processBlocksJob.handle();

		processStub.calledOnce();
		forkBlockSpy.calledOnce(); // because Rollback
	});

	it("should not process the remaining blocks if one is not accepted (BlockProcessorResult.Rejected)", async (context) => {
		const genesisBlock = Networks.testnet.genesisBlock;
		stub(blockchainService, "getLastBlock").returnValue({ data: genesisBlock });
		const processStub = stub(blockProcessor, "process").returnValue(BlockProcessorResult.Rejected);
		stub(stateStore, "getLastBlock").returnValue({ data: genesisBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: genesisBlock });

		const clearQueueSpy = spy(blockchainService, "clearQueue");
		spy(databaseInteraction, "loadBlocksFromCurrentRound");
		const resetLastDownloadedBlockSpy = spy(blockchainService, "resetLastDownloadedBlock");

		context.processBlocksJob.setBlocks([context.lastBlock, context.currentBlock]);
		await context.processBlocksJob.handle();

		processStub.calledOnce();
		clearQueueSpy.calledOnce();
		resetLastDownloadedBlockSpy.calledOnce();
	});

	it("should not process the remaining blocks if second is not accepted (BlockProcessorResult.Rejected)", async (context) => {
		const genesisBlock = Networks.testnet.genesisBlock;
		stub(blockchainService, "getLastBlock")
			.returnValueNth(0, { data: genesisBlock })
			.returnValueNth(1, { data: genesisBlock })
			.returnValueNth(2, Blocks.block2);
		const processStub = stub(blockProcessor, "process")
			.returnValueNth(0, BlockProcessorResult.Accepted)
			.returnValueNth(1, BlockProcessorResult.Rejected);
		stub(stateStore, "getLastBlock").returnValue({ data: genesisBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: genesisBlock });

		spy(stateStore, "setLastBlock");
		spy(databaseInteraction, "loadBlocksFromCurrentRound");
		const clearQueueSpy = spy(blockchainService, "clearQueue");
		const resetLastDownloadedBlockSpy = spy(blockchainService, "resetLastDownloadedBlock");
		const saveBlocksSpy = spy(databaseBlockRepository, "saveBlocks");
		const setLastStoredBlockHeightSpy = spy(stateStore, "setLastStoredBlockHeight");

		context.processBlocksJob.setBlocks([context.lastBlock, context.currentBlock]);
		await context.processBlocksJob.handle();

		processStub.calledTimes(2);
		saveBlocksSpy.calledOnce();
		clearQueueSpy.calledOnce();
		resetLastDownloadedBlockSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledWith(context.lastBlock.height);
	});

	it("should not process the remaining blocks if one is not accepted (BlockProcessorResult.Corrupted)", async (context) => {
		const exitSpy = stub(process, "exit");

		const genesisBlock = Networks.testnet.genesisBlock;
		stub(blockchainService, "getLastBlock").returnValue({ data: genesisBlock });
		const processStub = stub(blockProcessor, "process").returnValue(BlockProcessorResult.Corrupted);
		stub(stateStore, "getLastBlock").returnValue({ data: genesisBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: genesisBlock });

		const clearQueueSpy = spy(blockchainService, "clearQueue");
		spy(databaseInteraction, "loadBlocksFromCurrentRound");
		const resetLastDownloadedBlockSpy = spy(blockchainService, "resetLastDownloadedBlock");

		context.processBlocksJob.setBlocks([context.lastBlock, context.currentBlock]);
		await context.processBlocksJob.handle();

		processStub.calledOnce();
		clearQueueSpy.neverCalled();
		resetLastDownloadedBlockSpy.neverCalled();
		exitSpy.calledOnce();
	});

	it("should revert block when blockRepository saveBlocks fails", async (context) => {
		const revertBlockHandler = {
			execute: stubFn().returns(BlockProcessorResult.Reverted),
		};

		stub(context.sandbox.app, "resolve").returnValue(revertBlockHandler);
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(blockProcessor, "process").returnValue(BlockProcessorResult.Accepted);
		stub(databaseBlockRepository, "saveBlocks").rejectedValue(new Error("oops"));

		const clearQueueSpy = spy(blockchainService, "clearQueue");
		const resetLastDownloadedBlockSpy = spy(blockchainService, "resetLastDownloadedBlock");
		const restoreCurrentRoundSpy = spy(databaseInteraction, "restoreCurrentRound");
		const deleteRoundSpy = spy(databaseService, "deleteRound");
		const setLastStoredBlockHeightSpy = spy(stateStore, "setLastStoredBlockHeight");
		spy(stateStore, "setLastBlock");

		context.processBlocksJob.setBlocks([context.currentBlock]);
		await context.processBlocksJob.handle();

		clearQueueSpy.calledOnce();
		resetLastDownloadedBlockSpy.calledOnce();
		restoreCurrentRoundSpy.calledOnce();
		deleteRoundSpy.calledOnce();
		setLastStoredBlockHeightSpy.neverCalled();
	});

	it("should stop app when revertBlockHandler return Corrupted", async (context) => {
		const exitSpy = stub(process, "exit");

		const revertBlockHandler = {
			execute: stubFn().returns(BlockProcessorResult.Corrupted),
		};
		stub(context.sandbox.app, "resolve").returnValue(revertBlockHandler);
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(blockProcessor, "process").returnValue(BlockProcessorResult.Accepted);
		stub(databaseBlockRepository, "saveBlocks").rejectedValue(new Error("oops"));

		const clearQueueSpy = spy(blockchainService, "clearQueue");
		const resetLastDownloadedBlockSpy = spy(blockchainService, "resetLastDownloadedBlock");
		const restoreCurrentRoundSpy = spy(databaseInteraction, "restoreCurrentRound");
		const deleteRoundSpy = spy(databaseService, "deleteRound");
		const setLastStoredBlockHeightSpy = spy(stateStore, "setLastStoredBlockHeight");
		spy(stateStore, "setLastBlock");

		context.processBlocksJob.setBlocks([context.currentBlock]);
		await context.processBlocksJob.handle();

		clearQueueSpy.calledOnce();
		resetLastDownloadedBlockSpy.calledOnce();
		restoreCurrentRoundSpy.calledOnce();
		deleteRoundSpy.calledOnce();
		setLastStoredBlockHeightSpy.neverCalled();

		exitSpy.calledOnce();
	});

	it("should broadcast a block if state is newBlock", async (context) => {
		stub(stateMachine, "getState").returnValue("newBlock");

		const getTimeStampForBlock = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		let slotInfo = Crypto.Slots.getSlotInfo(getTimeStampForBlock);

		// Wait until we get a timestamp at the first half of a slot (allows for computation time)
		while (!slotInfo.forgingStatus) {
			slotInfo = Crypto.Slots.getSlotInfo(getTimeStampForBlock);
		}

		const block = {
			...context.currentBlock,
			timestamp: slotInfo.startTime,
		};

		stub(stateStore, "isStarted").returnValue(true);
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(blockProcessor, "process").returnValue(BlockProcessorResult.Accepted);

		const saveBlocksSpy = spy(databaseBlockRepository, "saveBlocks");
		const broadcastBlockSpy = spy(peerNetworkMonitor, "broadcastBlock");
		const setLastStoredBlockHeightSpy = spy(stateStore, "setLastStoredBlockHeight");

		context.processBlocksJob.setBlocks([block]);
		await context.processBlocksJob.handle();

		saveBlocksSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledWith(block.height);
		broadcastBlockSpy.calledOnce();
	});

	it("should skip broadcasting if state is downloadFinished", async (context) => {
		stub(stateMachine, "getState").returnValue("downloadFinished");

		const getTimeStampForBlock = (height: number) => {
			switch (height) {
				case 1:
					return 0;
				default:
					throw new Error(`Test scenarios should not hit this line`);
			}
		};

		let slotInfo = Crypto.Slots.getSlotInfo(getTimeStampForBlock);

		// Wait until we get a timestamp at the first half of a slot (allows for computation time)
		while (!slotInfo.forgingStatus) {
			slotInfo = Crypto.Slots.getSlotInfo(getTimeStampForBlock);
		}

		const block = {
			...context.currentBlock,
			timestamp: slotInfo.startTime,
		};

		stub(stateStore, "isStarted").returnValue(true);
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(blockProcessor, "process").returnValue(BlockProcessorResult.Accepted);

		const saveBlocksSpy = spy(databaseBlockRepository, "saveBlocks");
		const broadcastBlockSpy = spy(peerNetworkMonitor, "broadcastBlock");
		const setLastStoredBlockHeightSpy = spy(stateStore, "setLastStoredBlockHeight");

		context.processBlocksJob.setBlocks([block]);
		await context.processBlocksJob.handle();

		saveBlocksSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledWith(block.height);

		broadcastBlockSpy.neverCalled();
	});
});

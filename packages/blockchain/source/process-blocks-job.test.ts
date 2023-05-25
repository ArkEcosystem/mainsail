import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import { rejects } from "assert";

import { describe, Sandbox } from "../../test-framework";
import { Blocks } from "../test/fixtures";
import { ProcessBlocksJob } from "./process-blocks-job";

describe<{
	sandbox: Sandbox;
	processBlocksJob: ProcessBlocksJob;
	configuration: any;
	blockFactory: any;
	slots: any;
	triggers: any;

	lastBlock: Contracts.Crypto.IBlockData;
	currentBlock: Contracts.Crypto.IBlockData;
}>("ProcessBlocksJob", ({ assert, beforeEach, it, spy, stub }) => {
	const blockchainService: any = {
		clearQueue: () => {},
		getLastBlock: () => {},
		resetLastDownloadedBlock: () => {},
	};
	const stateMachine: any = {
		getState: () => {},
	};
	const blockProcessor: any = {
		process: () => {},
		validateGenerator: () => {},
	};
	const stateStore: any = {
		// stateStore: () => undefined,
		getLastBlock: () => {},

		isStarted: () => {},

		setLastBlock: () => {},
		setLastStoredBlockHeight: () => {},
	};
	const databaseService: any = {
		deleteRound: () => {},
		getLastBlock: () => {},
		saveBlocks: () => {},
	};
	const databaseInteraction: any = {
		loadBlocksFromCurrentRound: () => {},
		restoreCurrentRound: () => {},
	};
	const peerNetworkMonitor: any = {
		broadcastBlock: () => {},
	};
	const logService: any = {
		debug: () => {},
		error: () => {},
		info: () => {},
		warning: () => {},
	};

	beforeEach((context) => {
		context.configuration = {};
		context.blockFactory = {
			fromData: (blockData) => ({
				data: blockData,
			}),
		};
		context.slots = {
			getSlotNumber: async () => {},
			withBlockTimeLookup: () => {},
		};

		context.triggers = {
			call: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.BlockchainService).toConstantValue(blockchainService);
		context.sandbox.app.bind(Identifiers.StateMachine).toConstantValue(stateMachine);
		context.sandbox.app.bind(Identifiers.BlockProcessor).toConstantValue(blockProcessor);
		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(stateStore);
		context.sandbox.app.bind(Identifiers.Database.Service).toConstantValue(databaseService);
		context.sandbox.app.bind(Identifiers.DatabaseInteraction).toConstantValue(databaseInteraction);
		context.sandbox.app.bind(Identifiers.PeerNetworkMonitor).toConstantValue(peerNetworkMonitor);
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(logService);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.sandbox.app.bind(Identifiers.Cryptography.Block.Factory).toConstantValue(context.blockFactory);
		context.sandbox.app.bind(Identifiers.Cryptography.Time.Slots).toConstantValue(context.slots);
		context.sandbox.app.bind(Identifiers.Cryptography.Time.BlockTimeLookup).toConstantValue({});

		context.sandbox.app.bind(Identifiers.TriggerService).toConstantValue(context.triggers);
		// context.sandbox.app
		// 	.get<Services.Triggers.Triggers>(Identifiers.TriggerService)
		// 	.bind("processBlock", new ProcessBlockAction());

		context.processBlocksJob = context.sandbox.app.resolve(ProcessBlocksJob);

		context.lastBlock = { ...Blocks.block2.data, transactions: [] };
		context.currentBlock = { ...Blocks.block3.data, transactions: [] };
	});

	it("should set and get blocks", async (context) => {
		const blocks = [
			{ ...Blocks.block2.data, transactions: [] },
			{ ...Blocks.block3.data, transactions: [] },
		] as Contracts.Crypto.IBlockData[];

		context.processBlocksJob.setBlocks(blocks);

		assert.equal(context.processBlocksJob.getBlocks(), blocks);
	});

	it("should skip processing if blocks are not set", async (context) => {
		await assert.resolves(() => context.processBlocksJob.handle());
	});

	it("should process a new chained block", async (context) => {
		stub(context.slots, "withBlockTimeLookup").returnValue(context.slots);
		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(context.triggers, "call").resolvedValue(true);
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock }); // TODO: Use stateStore
		stub(blockProcessor, "process").returnValue(true);
		stub(blockProcessor, "validateGenerator").returnValue(true);
		stub(stateStore, "isStarted").returnValue(true);

		const saveBlocksSpy = spy(databaseService, "saveBlocks");
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

	it("should not process the remaining blocks if one is not accepted", async (context) => {
		stub(context.slots, "withBlockTimeLookup").returnValue(context.slots);
		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(blockchainService, "getLastBlock").returnValue({ data: { height: 1 } });
		const callStub = stub(context.triggers, "call").returnValue(false);
		stub(databaseService, "getLastBlock").returnValue({ data: { height: 1 } });

		const clearQueueSpy = spy(blockchainService, "clearQueue");
		spy(databaseInteraction, "loadBlocksFromCurrentRound");
		const resetLastDownloadedBlockSpy = spy(blockchainService, "resetLastDownloadedBlock");

		context.processBlocksJob.setBlocks([context.lastBlock, context.currentBlock]);
		await context.processBlocksJob.handle();

		callStub.calledOnce();
		clearQueueSpy.calledOnce();
		resetLastDownloadedBlockSpy.calledOnce();
	});

	it("should not process the remaining blocks if second is not accepted", async (context) => {
		stub(context.slots, "withBlockTimeLookup").returnValue(context.slots);
		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(blockchainService, "getLastBlock")
			.returnValueNth(0, { data: { height: 1 } })
			.returnValueNth(1, { data: { height: 1 } })
			.returnValueNth(2, Blocks.block2);

		const callStub = stub(context.triggers, "call").returnValueNth(0, true).returnValueNth(1, false);

		stub(stateStore, "getLastBlock").returnValue({ data: { height: 1 } });
		stub(databaseService, "getLastBlock").returnValue({ data: { height: 1 } });

		spy(stateStore, "setLastBlock");
		spy(databaseInteraction, "loadBlocksFromCurrentRound");
		const clearQueueSpy = spy(blockchainService, "clearQueue");
		const resetLastDownloadedBlockSpy = spy(blockchainService, "resetLastDownloadedBlock");
		const saveBlocksSpy = spy(databaseService, "saveBlocks");
		const setLastStoredBlockHeightSpy = spy(stateStore, "setLastStoredBlockHeight");

		context.processBlocksJob.setBlocks([context.lastBlock, context.currentBlock]);
		await context.processBlocksJob.handle();

		callStub.calledTimes(2);
		saveBlocksSpy.calledOnce();
		clearQueueSpy.calledOnce();
		resetLastDownloadedBlockSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledOnce();
		setLastStoredBlockHeightSpy.calledWith(context.lastBlock.height);
	});

	it("should log and throw error when blockRepository saveBlocks fails", async (context) => {
		stub(Utils.roundCalculator, "calculateRound").returnValue({ round: 1 });
		stub(context.slots, "withBlockTimeLookup").returnValue(context.slots);
		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(context.triggers, "call").returnValue(true);
		stub(databaseService, "saveBlocks").rejectedValue(new Error("oops"));

		const logErrorSpy = spy(logService, "error");
		const clearQueueSpy = spy(blockchainService, "clearQueue");
		const resetLastDownloadedBlockSpy = spy(blockchainService, "resetLastDownloadedBlock");
		const restoreCurrentRoundSpy = spy(databaseInteraction, "restoreCurrentRound");
		const deleteRoundSpy = spy(databaseService, "deleteRound");
		const setLastStoredBlockHeightSpy = spy(stateStore, "setLastStoredBlockHeight");
		spy(stateStore, "setLastBlock");

		context.processBlocksJob.setBlocks([context.currentBlock]);
		await rejects(() => context.processBlocksJob.handle());

		logErrorSpy.calledOnce();
		clearQueueSpy.neverCalled();
		resetLastDownloadedBlockSpy.neverCalled();
		restoreCurrentRoundSpy.neverCalled();
		deleteRoundSpy.neverCalled();
		setLastStoredBlockHeightSpy.neverCalled();
	});

	it("should broadcast a block if state is newBlock", async (context) => {
		stub(stateMachine, "getState").returnValue("newBlock");

		const block = {
			...context.currentBlock,
		};

		stub(context.slots, "withBlockTimeLookup").returnValue(context.slots);
		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(stateStore, "isStarted").returnValue(true);
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(context.triggers, "call").returnValue(true);

		const saveBlocksSpy = spy(databaseService, "saveBlocks");
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

		const block = {
			...context.currentBlock,
		};

		stub(context.slots, "withBlockTimeLookup").returnValue(context.slots);
		stub(context.slots, "getSlotNumber").returnValue(1);
		stub(stateStore, "isStarted").returnValue(true);
		stub(blockchainService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(databaseService, "getLastBlock").returnValue({ data: context.lastBlock });
		stub(context.triggers, "call").returnValue(true);

		const saveBlocksSpy = spy(databaseService, "saveBlocks");
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

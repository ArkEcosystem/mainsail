import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";
import { describe } from "../../../../core-test-framework";

import { BlockProcessorResult } from "../contracts";
import { RevertBlockHandler } from "./revert-block-handler";

describe<{
	container: Container.Container;
	logger: any;
	state: any;
	transactionPool: any;
	databaseInteractions: any;
	databaseService: any;
	block: any;
	previousBlock: any;
	randomBlock: any;
}>("AcceptBlockHandler", ({ assert, beforeEach, it, spy, spyFn, stub }) => {
	beforeEach((context) => {
		context.logger = {
			warning: () => undefined,
			debug: () => undefined,
			info: () => undefined,
			error: () => undefined,
		};
		context.state = {
			getLastBlocks: () => undefined,
			setLastBlock: () => undefined,
		};
		context.transactionPool = {
			addTransaction: () => undefined,
		};
		context.databaseInteractions = {
			revertBlock: () => undefined,
		};
		context.databaseService = {
			getLastBlock: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Container.Identifiers.StateStore).toConstantValue(context.state);
		context.container.bind(Container.Identifiers.DatabaseInteraction).toConstantValue(context.databaseInteractions);
		context.container.bind(Container.Identifiers.DatabaseService).toConstantValue(context.databaseService);
		context.container.bind(Container.Identifiers.TransactionPoolService).toConstantValue(context.transactionPool);

		context.block = {
			data: { id: "1222", height: 5544 },
			transactions: [{ id: "11" }, { id: "12" }],
		};
		context.previousBlock = {
			data: { id: "1221", height: 5543 },
			transactions: [{ id: "11" }, { id: "12" }],
		};

		context.randomBlock = {
			data: { id: "123", height: 5540 },
			transactions: [{ id: "11" }, { id: "12" }],
		};
	});

	it("should revert block, transactions and resetLastDownloadedBlock", async (context) => {
		const revertBlockHandler = context.container.resolve<RevertBlockHandler>(RevertBlockHandler);

		stub(context.state, "getLastBlocks").returnValue([context.previousBlock]);
		const revertBlockSpy = spy(context.databaseInteractions, "revertBlock");
		const addTransactionSpy = spy(context.transactionPool, "addTransaction");
		const getLastBlockSpy = spy(context.databaseService, "getLastBlock");
		const setLastBlockSpy = spy(context.state, "setLastBlock");

		const result = await revertBlockHandler.execute(context.block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Reverted);
		revertBlockSpy.calledOnce();
		revertBlockSpy.calledWith(context.block);
		addTransactionSpy.calledTimes(2);
		addTransactionSpy.calledWith(context.block.transactions[0]);
		addTransactionSpy.calledWith(context.block.transactions[1]);
		getLastBlockSpy.neverCalled();
		setLastBlockSpy.calledOnce();
		setLastBlockSpy.calledWith(context.previousBlock);
	});

	it("should take previous block from database if state is empty", async (context) => {
		const revertBlockHandler = context.container.resolve<RevertBlockHandler>(RevertBlockHandler);

		stub(context.state, "getLastBlocks").returnValue([]);
		const getLastBlockStub = stub(context.databaseService, "getLastBlock").resolvedValue(context.previousBlock);
		const revertBlockSpy = spy(context.databaseInteractions, "revertBlock");
		const addTransactionSpy = spy(context.transactionPool, "addTransaction");
		const setLastBlockSpy = spy(context.state, "setLastBlock");

		const result = await revertBlockHandler.execute(context.block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Reverted);
		revertBlockSpy.calledOnce();
		revertBlockSpy.calledWith(context.block);
		addTransactionSpy.calledTimes(2);
		addTransactionSpy.calledWith(context.block.transactions[0]);
		addTransactionSpy.calledWith(context.block.transactions[1]);
		getLastBlockStub.calledOnce();
		setLastBlockSpy.calledOnce();
		setLastBlockSpy.calledWith(context.previousBlock);
	});

	it("should return Corrupted if revertBlock throws", async (context) => {
		const revertBlockHandler = context.container.resolve<RevertBlockHandler>(RevertBlockHandler);

		stub(context.state, "getLastBlocks").returnValue([]);
		stub(context.databaseInteractions, "revertBlock").rejectedValue(new Error("oops"));

		const result = await revertBlockHandler.execute(context.block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Corrupted);
	});

	it("should return Corrupted if block is not following previous block", async (context) => {
		const revertBlockHandler = context.container.resolve<RevertBlockHandler>(RevertBlockHandler);

		stub(context.state, "getLastBlocks").returnValue([]);
		const getLastBlockStub = stub(context.databaseService, "getLastBlock").resolvedValue(context.randomBlock);
		const revertBlockSpy = spy(context.databaseInteractions, "revertBlock");
		const addTransactionSpy = spy(context.transactionPool, "addTransaction");
		const setLastBlockSpy = spy(context.state, "setLastBlock");

		const result = await revertBlockHandler.execute(context.block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Corrupted);
		revertBlockSpy.calledOnce();
		revertBlockSpy.calledWith(context.block);
		addTransactionSpy.calledTimes(2);
		addTransactionSpy.calledWith(context.block.transactions[0]);
		addTransactionSpy.calledWith(context.block.transactions[1]);
		getLastBlockStub.calledOnce();
		setLastBlockSpy.neverCalled();
	});
});

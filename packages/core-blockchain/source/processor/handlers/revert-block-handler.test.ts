import { Container } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { BlockProcessorResult } from "../contracts";
import { RevertBlockHandler } from "./revert-block-handler";

describe<{
	container: Container;
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
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		};
		context.state = {
			getLastBlocks: () => {},
			setLastBlock: () => {},
		};
		context.transactionPool = {
			addTransaction: () => {},
		};
		context.databaseInteractions = {
			revertBlock: () => {},
		};
		context.databaseService = {
			getLastBlock: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Identifiers.StateStore).toConstantValue(context.state);
		context.container.bind(Identifiers.DatabaseInteraction).toConstantValue(context.databaseInteractions);
		context.container.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
		context.container.bind(Identifiers.TransactionPoolService).toConstantValue(context.transactionPool);

		context.block = {
			data: { height: 5544, id: "1222" },
			transactions: [{ id: "11" }, { id: "12" }],
		};
		context.previousBlock = {
			data: { height: 5543, id: "1221" },
			transactions: [{ id: "11" }, { id: "12" }],
		};

		context.randomBlock = {
			data: { height: 5540, id: "123" },
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

		const result = await revertBlockHandler.execute(context.block as Contracts.Crypto.IBlock);

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

		const result = await revertBlockHandler.execute(context.block as Contracts.Crypto.IBlock);

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

		const result = await revertBlockHandler.execute(context.block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Corrupted);
	});

	it("should return Corrupted if block is not following previous block", async (context) => {
		const revertBlockHandler = context.container.resolve<RevertBlockHandler>(RevertBlockHandler);

		stub(context.state, "getLastBlocks").returnValue([]);
		const getLastBlockStub = stub(context.databaseService, "getLastBlock").resolvedValue(context.randomBlock);
		const revertBlockSpy = spy(context.databaseInteractions, "revertBlock");
		const addTransactionSpy = spy(context.transactionPool, "addTransaction");
		const setLastBlockSpy = spy(context.state, "setLastBlock");

		const result = await revertBlockHandler.execute(context.block as Contracts.Crypto.IBlock);

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

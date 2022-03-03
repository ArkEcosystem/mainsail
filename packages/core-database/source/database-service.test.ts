import { Container } from "@arkecosystem/core-container";
import { Blocks } from "@arkecosystem/crypto";
import { describe } from "../../core-test-framework";

import { DatabaseService } from "./database-service";
import block1760000 from "../test/fixtures/block1760000";

describe<{
	container: Container.Container;
	app: any;
	connection: any;
	blockRepository: any;
	transactionRepository: any;
	roundRepository: any;
	events: any;
	logger: any;
}>("DatabaseService", ({ afterEach, assert, beforeEach, it, spy, spyFn, stub }) => {
	beforeEach((context) => {
		context.app = {
			get: () => undefined,
			terminate: () => undefined,
		};

		context.connection = {
			query: () => undefined,
			close: () => undefined,
		};

		context.blockRepository = {
			findOne: () => undefined,
			findByHeightRange: () => undefined,
			findByHeightRangeWithTransactions: () => undefined,
			findByHeightRangeWithTransactionsForDownload: () => undefined,
			findLatest: () => undefined,
			findByIds: () => undefined,
			findRecent: () => undefined,
			findTop: () => undefined,
			count: () => undefined,
			getStatistics: () => undefined,
			saveBlocks: () => undefined,
			deleteBlocks: () => undefined,
		};

		context.transactionRepository = {
			find: () => undefined,
			findOne: () => undefined,
			findByBlockIds: () => undefined,
			getStatistics: () => undefined,
		};

		context.roundRepository = {
			getRound: () => undefined,
			save: () => undefined,
			deleteFrom: () => undefined,
		};

		context.events = {
			call: () => undefined,
			dispatch: () => undefined,
		};

		context.logger = {
			error: () => undefined,
			warning: () => undefined,
			info: () => undefined,
			debug: () => undefined,
		};

		context.container = new Container();
		context.container.bind(Identifiers.Application).toConstantValue(context.app);
		context.container.bind(Identifiers.DatabaseConnection).toConstantValue(context.connection);
		context.container.bind(Identifiers.DatabaseBlockRepository).toConstantValue(context.blockRepository);
		context.container
			.bind(Identifiers.DatabaseTransactionRepository)
			.toConstantValue(context.transactionRepository);
		context.container.bind(Identifiers.DatabaseRoundRepository).toConstantValue(context.roundRepository);
		context.container.bind(Identifiers.EventDispatcherService).toConstantValue(context.events);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);
	});

	afterEach(() => {
		delete process.env.CORE_RESET_DATABASE;
	});

	it("initialize should reset database when CORE_RESET_DATABASE variable is set", async (context) => {
		context.connection.query = spyFn();

		const databaseService = context.container.resolve(DatabaseService);

		process.env.CORE_RESET_DATABASE = "1";

		await databaseService.initialize();

		assert.true(
			context.connection.query.calledWith("TRUNCATE TABLE blocks, rounds, transactions RESTART IDENTITY;"),
		);
	});

	it("initialize should terminate app if exception was raised", async (context) => {
		context.app.terminate = spyFn();

		const databaseService = context.container.resolve(DatabaseService);

		process.env.CORE_RESET_DATABASE = "1";

		stub(databaseService, "reset").callsFake(() => {
			throw new Error("Fail");
		});

		await databaseService.initialize();

		assert.true(context.app.terminate.calledWith());
	});

	it("disconnect should close connection", async (context) => {
		context.connection.close = spyFn();

		const databaseService = context.container.resolve(DatabaseService);
		await databaseService.disconnect();

		assert.true(context.connection.close.calledWith());
	});

	it("disconnect should emit disconnect events", async (context) => {
		context.events.dispatch = spyFn();

		const databaseService = context.container.resolve(DatabaseService);
		await databaseService.disconnect();

		assert.true(context.events.dispatch.calledWith("database.preDisconnect"));
		assert.true(context.events.dispatch.calledWith("database.postDisconnect"));
	});

	it("reset should reset database", async (context) => {
		context.connection.query = spyFn();

		const databaseService = context.container.resolve(DatabaseService);

		await databaseService.reset();

		assert.true(
			context.connection.query.calledWith("TRUNCATE TABLE blocks, rounds, transactions RESTART IDENTITY;"),
		);
	});

	it("getBlock should return block", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const block = Blocks.BlockFactory.fromData(block1760000);
		stub(context.blockRepository, "findOne").returnValueOnce({ ...block.data });
		stub(context.transactionRepository, "find").returnValueOnce(block.transactions);

		const result = await databaseService.getBlock(block.data.id);

		context.blockRepository.findOne.calledWith(block.data.id);
		context.transactionRepository.find.calledWith({ blockId: block.data.id });
		assert.equal(result, block);
	});

	it("getBlock should return undefined when block was not found", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		stub(context.blockRepository, "findOne").returnValueOnce(undefined);

		const blockId = "non_existing_id";
		const result = await databaseService.getBlock(blockId);

		context.blockRepository.findOne.calledWith(blockId);
		assert.undefined(result);
	});

	it("getBlocks should return blocks with transactions when full blocks are requested", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const block100 = { height: 100, transactions: [] };
		const block101 = { height: 101, transactions: [] };
		const block102 = { height: 102, transactions: [] };

		stub(context.blockRepository, "findByHeightRangeWithTransactions").returnValueOnce([
			block100,
			block101,
			block102,
		]);

		const result = await databaseService.getBlocks(100, 102);

		context.blockRepository.findByHeightRangeWithTransactions.calledWith(100, 102);
		assert.equal(result, [block100, block101, block102]);
	});

	it("getBlocks should return blocks without transactions when block headers are requested", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const block100 = { height: 100 };
		const block101 = { height: 101 };
		const block102 = { height: 102 };

		stub(context.blockRepository, "findByHeightRange").returnValueOnce([block100, block101, block102]);

		const result = await databaseService.getBlocks(100, 102, true);

		context.blockRepository.findByHeightRange.calledWith(100, 102);
		assert.equal(result, [block100, block101, block102]);
	});

	it("getBlocksForDownload should return blocks with transactions when full blocks are requested", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const block100 = { height: 100, transactions: [] };
		const block101 = { height: 101, transactions: [] };
		const block102 = { height: 102, transactions: [] };

		stub(context.blockRepository, "findByHeightRangeWithTransactionsForDownload").returnValueOnce([
			block100,
			block101,
			block102,
		]);

		const result = await databaseService.getBlocksForDownload(100, 3);

		context.blockRepository.findByHeightRangeWithTransactionsForDownload.calledWith(100, 102);
		assert.equal(result, [block100, block101, block102]);
	});

	it("getBlocksForDownload should return blocks without transactions when block headers are requested", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const block100 = { height: 100 };
		const block101 = { height: 101 };
		const block102 = { height: 102 };

		stub(context.blockRepository, "findByHeightRange").returnValueOnce([block100, block101, block102]);

		const result = await databaseService.getBlocksForDownload(100, 3, true);

		context.blockRepository.findByHeightRange.calledWith(100, 102);
		assert.equal(result, [block100, block101, block102]);
	});

	it("getLastBlock should return undefined if there are no blocks", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		stub(context.blockRepository, "findLatest").returnValueOnce(undefined);

		const result = await databaseService.getLastBlock();

		context.blockRepository.findLatest.calledWith();
		assert.undefined(result);
	});

	it("getLastBlock should return last block from repository", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const lastBlock = Blocks.BlockFactory.fromData(block1760000);
		stub(context.blockRepository, "findLatest").returnValueOnce({ ...lastBlock.data });
		stub(context.transactionRepository, "findByBlockIds").returnValueOnce(lastBlock.transactions);

		const result = await databaseService.getLastBlock();

		context.blockRepository.findLatest.calledWith();
		context.transactionRepository.findByBlockIds.calledWith([lastBlock.data.id]);
		assert.equal(result, lastBlock);
	});

	it("getTopBlocks should return top blocks with transactions", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const block = Blocks.BlockFactory.fromData(block1760000);
		stub(context.blockRepository, "findTop").returnValueOnce([block.data]);

		const dbTransactions = block.transactions.map((t) => ({
			id: t.data.id,
			blockId: block.data.id,
			serialized: t.serialized,
		}));
		stub(context.transactionRepository, "findByBlockIds").returnValueOnce(dbTransactions);

		const topCount = 1;
		const result = await databaseService.getTopBlocks(topCount);

		context.blockRepository.findTop.calledWith(topCount);
		context.transactionRepository.findByBlockIds.calledWith([block.data.id]);
		assert.equal(result, [block.data]);
	});

	it("getTopBlocks should return empty array when there are no blocks", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		stub(context.blockRepository, "findTop").returnValueOnce([]);

		const topCount = 1;
		const result = await databaseService.getTopBlocks(topCount);

		context.blockRepository.findTop.calledWith(topCount);
		assert.equal(result, []);
	});

	it("getTransaction should return transaction from transaction repository", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const dbTransaction = {};
		stub(context.transactionRepository, "findOne").returnValueOnce(dbTransaction);

		const transactionId = "123";
		const result = await databaseService.getTransaction(transactionId);

		context.transactionRepository.findOne.calledWith(transactionId);
		assert.is(result, dbTransaction);
	});

	it("saveRound should save delegates to round repository and fire events", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const round = 2;
		const delegate1 = { publicKey: "delegate1 public key", getAttribute: () => undefined };
		const delegate2 = { publicKey: "delegate2 public key", getAttribute: () => undefined };

		stub(delegate1, "getAttribute").returnValueOnce(round);
		spy(context.roundRepository, "save");
		spy(context.events, "dispatch");

		const activeDelegates = [delegate1, delegate2];
		await databaseService.saveRound(activeDelegates as any);

		delegate1.getAttribute.calledWith("delegate.round");
		assert.true(context.roundRepository.save.calledWith(activeDelegates));
		assert.true(context.events.dispatch.calledWith("round.created", activeDelegates));
	});

	it("deleteRound should delete round from round repository", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		spy(context.roundRepository, "deleteFrom");

		const round = 2;
		await databaseService.deleteRound(round);

		assert.true(context.roundRepository.deleteFrom.calledWith(round));
	});

	it("verifyBlockchain should return false when there are no blocks", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const numberOfBlocks = 0;
		const numberOfTransactions = 0;
		const totalFee = "0";
		const totalAmount = "0";

		const blockStats = { numberOfTransactions, totalFee, totalAmount, count: numberOfBlocks };
		stub(context.blockRepository, "getStatistics").returnValueOnce(blockStats);

		const transactionStats = { totalFee, totalAmount, count: numberOfTransactions };
		stub(context.transactionRepository, "getStatistics").returnValueOnce(transactionStats);

		const result = await databaseService.verifyBlockchain();

		context.blockRepository.getStatistics.calledWith();
		context.transactionRepository.getStatistics.calledWith();
		assert.false(result);
	});

	it("verifyBlockchain should return false when there are discrepancies", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const lastBlock = Blocks.BlockFactory.fromData(block1760000);

		const numberOfBlocks = 1760000;
		const numberOfTransactions = 999999;
		const totalFee = "100000";
		const totalAmount = "10000000";

		stub(context.blockRepository, "count").returnValueOnce(numberOfBlocks + 1);

		const blockStats = { numberOfTransactions, totalFee, totalAmount, count: numberOfBlocks };
		stub(context.blockRepository, "getStatistics").returnValueOnce(blockStats);

		const transactionStats = {
			totalFee: totalAmount,
			totalAmount: totalFee,
			count: numberOfTransactions + 1,
		};
		stub(context.transactionRepository, "getStatistics").returnValueOnce(transactionStats);

		const result = await databaseService.verifyBlockchain(lastBlock);

		context.blockRepository.count.calledWith();
		context.blockRepository.getStatistics.calledWith();
		context.transactionRepository.getStatistics.calledWith();
		assert.false(result);
	});

	it("verifyBlockchain should check last block statistics", async (context) => {
		const databaseService = context.container.resolve(DatabaseService);

		const lastBlock = Blocks.BlockFactory.fromData(block1760000);

		const numberOfBlocks = 1760000;
		const numberOfTransactions = 999999;
		const totalFee = "100000";
		const totalAmount = "10000000";

		stub(context.blockRepository, "count").returnValueOnce(numberOfBlocks);

		const blockStats = { numberOfTransactions, totalFee, totalAmount, count: numberOfBlocks };
		stub(context.blockRepository, "getStatistics").returnValueOnce(blockStats);

		const transactionStats = { totalFee, totalAmount, count: numberOfTransactions };
		stub(context.transactionRepository, "getStatistics").returnValueOnce(transactionStats);

		const result = await databaseService.verifyBlockchain(lastBlock);

		context.blockRepository.count.calledWith();
		context.blockRepository.getStatistics.calledWith();
		context.transactionRepository.getStatistics.calledWith();
		assert.true(result);
	});
});

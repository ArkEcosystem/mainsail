import { DatabaseService } from "@arkecosystem/core-database";
import { Container } from "@arkecosystem/core-kernel";
import { DatabaseInterceptor } from "./database-interceptor";
import { describe } from "@arkecosystem/core-test-framework";

describe<{
	blockRepository: any;
	container: Container.Container;
	stateStore: any;
}>("DatabaseInterceptor", ({ it, beforeAll, assert, stub }) => {
	beforeAll((context) => {
		context.blockRepository = {
			findOne: () => undefined,
			findByHeightRange: () => undefined,
			findByHeightRangeWithTransactions: () => undefined,
			findByHeightRangeWithTransactionsForDownload: () => undefined,
			findByHeights: () => undefined,
			findLatest: () => undefined,
			findByIds: () => undefined,
			findRecent: () => undefined,
			findTop: () => undefined,
			count: () => undefined,
			getStatistics: () => undefined,
			saveBlocks: () => undefined,
			deleteBlocks: () => undefined,
		};

		context.stateStore = {
			setGenesisBlock: () => undefined,
			getGenesisBlock: () => undefined,
			setLastBlock: () => undefined,
			getLastBlock: () => undefined,
			getLastBlocks: () => undefined,
			getLastBlocksByHeight: () => undefined,
			getCommonBlocks: () => undefined,
			getLastBlockIds: () => undefined,
		};

		const container = new Container.Container();
		container.bind(Container.Identifiers.Application).toConstantValue({
			get: () => undefined,
			terminate: () => undefined,
		});
		container.bind(Container.Identifiers.DatabaseConnection).toConstantValue({
			query: () => undefined,
			close: () => undefined,
		});
		container.bind(Container.Identifiers.DatabaseBlockRepository).toConstantValue(context.blockRepository);
		container.bind(Container.Identifiers.DatabaseTransactionRepository).toConstantValue({
			find: () => undefined,
			findOne: () => undefined,
			findByBlockIds: () => undefined,
			getStatistics: () => undefined,
		});
		container.bind(Container.Identifiers.DatabaseRoundRepository).toConstantValue({
			getRound: () => undefined,
			save: () => undefined,
			deleteFrom: () => undefined,
		});
		container.bind(Container.Identifiers.DatabaseService).to(DatabaseService).inSingletonScope();
		container.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		container.bind(Container.Identifiers.StateBlockStore).toConstantValue({
			resize: () => undefined,
		});
		container.bind(Container.Identifiers.StateTransactionStore).toConstantValue({
			resize: () => undefined,
		});
		container.bind(Container.Identifiers.TransactionHandlerRegistry).toConstantValue({
			getActivatedHandlerForData: () => undefined,
		});
		container.bind(Container.Identifiers.WalletRepository).toConstantValue({
			createWallet: () => undefined,
			findByPublicKey: () => undefined,
			findByUsername: () => undefined,
		});
		container.bind(Container.Identifiers.BlockState).toConstantValue({
			applyBlock: () => undefined,
			revertBlock: () => undefined,
		});
		container.bind(Container.Identifiers.DposState).toConstantValue({
			buildDelegateRanking: () => undefined,
			setDelegatesRound: () => undefined,
			getRoundDelegates: () => undefined,
		});
		container.bind(Container.Identifiers.DposPreviousRoundStateProvider).toConstantValue(() => undefined);
		container.bind(Container.Identifiers.TriggerService).toConstantValue({
			call: () => undefined,
		});
		container.bind(Container.Identifiers.EventDispatcherService).toConstantValue({
			call: () => undefined,
			dispatch: () => undefined,
		});
		container.bind(Container.Identifiers.LogService).toConstantValue({
			error: () => undefined,
			warning: () => undefined,
			info: () => undefined,
			debug: () => undefined,
		});

		context.container = container;
	});

	it("getBlock - should return block from state store", async (context) => {
		const databaseInterceptor: DatabaseInterceptor = context.container.resolve(DatabaseInterceptor);

		const block = { data: { id: "block_id", height: 100, transactions: [] } };

		const stateStoreStub = stub(context.stateStore, "getLastBlocks").returnValue([block]);

		assert.equal(await databaseInterceptor.getBlock("block_id"), block);
	});

	it("getBlock - should return block from database", async (context) => {
		const databaseInterceptor: DatabaseInterceptor = context.container.resolve(DatabaseInterceptor);
		const databaseService = context.container.get<DatabaseService>(Container.Identifiers.DatabaseService);

		const block = { data: { id: "block_id", height: 100, transactions: [] } };

		const stateStoreStub = stub(context.stateStore, "getLastBlocks").returnValue([]);
		const databaseServiceStub = stub(databaseService, "getBlock").returnValue(block);

		assert.equal(await databaseInterceptor.getBlock("block_id"), block);
	});

	it("getCommonBlocks - should return blocks by ids", async (context) => {
		const databaseInterceptor: DatabaseInterceptor = context.container.resolve(DatabaseInterceptor);

		const block100 = { id: "00100", height: 100, transactions: [] };
		const block101 = { id: "00101", height: 101, transactions: [] };
		const block102 = { id: "00102", height: 102, transactions: [] };

		const commonBlockStub = stub(context.stateStore, "getCommonBlocks").returnValue([block101, block102]);
		const findByIdsStub = stub(context.blockRepository, "findByIds").returnValue([block100, block101, block102]);

		const result = await databaseInterceptor.getCommonBlocks([block100.id, block101.id, block102.id]);

		commonBlockStub.calledWith([block100.id, block101.id, block102.id]);
		findByIdsStub.calledWith([block100.id, block101.id, block102.id]);
		assert.equal(result, [block100, block101, block102]);
	});

	it("getBlocksByHeight - should return blocks with transactions when full blocks are requested", async (context) => {
		const databaseInterceptor: DatabaseInterceptor = context.container.resolve(DatabaseInterceptor);

		const block100 = { height: 100, transactions: [] };
		const block101 = { height: 101, transactions: [] };
		const block102 = { height: 102, transactions: [] };

		const getLastBlockStub = stub(context.stateStore, "getLastBlocksByHeight");

		getLastBlockStub.returnValueNth(0, [block100]);
		getLastBlockStub.returnValueNth(1, []);
		getLastBlockStub.returnValueNth(2, [block102]);

		const blockRepoStub = stub(context.blockRepository, "findByHeights").returnValueOnce([block101]);

		const result = await databaseInterceptor.getBlocksByHeight([100, 101, 102]);

		getLastBlockStub.calledNthWith(0, 100, 100, true);
		getLastBlockStub.calledNthWith(1, 101, 101, true);
		getLastBlockStub.calledNthWith(2, 102, 102, true);

		blockRepoStub.calledWith([101]);

		assert.equal(result, [block100, block101, block102]);
	});
});

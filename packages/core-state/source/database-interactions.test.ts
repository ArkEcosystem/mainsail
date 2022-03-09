import { DatabaseService } from "@arkecosystem/core-database";
import { Container, Enums } from "@arkecosystem/core-kernel";
import { DatabaseInteraction } from "./database-interactions";
import { describe } from "@arkecosystem/core-test-framework";
import { Blocks } from "@arkecosystem/crypto";

describe<{
	app: any;
	blockRepository: any;
	blockState: any;
	connection: any;
	container: Container.Container;
	events: any;
	handlerRegistry: any;
	stateStore: any;
	roundState: any;
	transactionRepository: any;
}>("DatabaseInteractions", ({ it, assert, beforeAll, spy, stub, spyFn }) => {
	beforeAll((context) => {
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

		context.transactionRepository = {
			find: () => undefined,
			findOne: () => undefined,
			findByBlockIds: () => undefined,
			getStatistics: () => undefined,
		};

		context.stateStore = {
			setGenesisBlock: () => undefined,
			getGenesisBlock: () => undefined,
			setLastBlock: () => undefined,
			getLastBlock: () => undefined,
			getLastBlocksByHeight: () => undefined,
			getCommonBlocks: () => undefined,
			getLastBlockIds: () => undefined,
		};

		context.handlerRegistry = {
			getActivatedHandlerForData: () => undefined,
		};

		context.blockState = {
			applyBlock: () => undefined,
			revertBlock: () => undefined,
		};

		context.events = {
			call: () => undefined,
			dispatch: () => undefined,
		};

		context.roundState = {
			applyBlock: () => undefined,
			revertBlock: () => undefined,
			getActiveDelegates: () => undefined,
			restore: () => undefined,
			detectMissedBlocks: () => undefined,
		};

		const container = new Container.Container();
		container.bind(Container.Identifiers.Application).toConstantValue(context.app);
		container.bind(Container.Identifiers.DatabaseConnection).toConstantValue(context.connection);
		container.bind(Container.Identifiers.DatabaseBlockRepository).toConstantValue(context.blockRepository);
		container
			.bind(Container.Identifiers.DatabaseTransactionRepository)
			.toConstantValue(context.transactionRepository);
		container.bind(Container.Identifiers.DatabaseRoundRepository).toConstantValue({
			getRound: () => undefined,
			save: () => undefined,
			deleteFrom: () => undefined,
		});
		container.bind(Container.Identifiers.DatabaseService).to(DatabaseService);
		container.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		container.bind(Container.Identifiers.StateBlockStore).toConstantValue({
			resize: () => undefined,
		});
		container.bind(Container.Identifiers.StateTransactionStore).toConstantValue({
			resize: () => undefined,
		});
		container.bind(Container.Identifiers.TransactionHandlerRegistry).toConstantValue(context.handlerRegistry);
		container.bind(Container.Identifiers.WalletRepository).toConstantValue({
			createWallet: () => undefined,
			findByPublicKey: () => undefined,
			findByUsername: () => undefined,
		});
		container.bind(Container.Identifiers.BlockState).toConstantValue(context.blockState);
		container.bind(Container.Identifiers.DposState).toConstantValue({
			buildDelegateRanking: () => undefined,
			setDelegatesRound: () => undefined,
			getRoundDelegates: () => undefined,
		});
		container.bind(Container.Identifiers.DposPreviousRoundStateProvider).toConstantValue(() => undefined);
		container.bind(Container.Identifiers.TriggerService).toConstantValue({
			call: () => undefined,
		});
		container.bind(Container.Identifiers.EventDispatcherService).toConstantValue(context.events);

		container.bind(Container.Identifiers.LogService).toConstantValue({
			error: () => undefined,
			warning: () => undefined,
			info: () => undefined,
			debug: () => undefined,
		});

		container.bind(Container.Identifiers.RoundState).toConstantValue(context.roundState);

		context.container = container;
	});

	it("should dispatch starting event", async (context) => {
		const databaseInteraction: DatabaseInteraction = context.container.resolve(DatabaseInteraction);

		const eventsStub = spy(context.events, "dispatch");

		await databaseInteraction.initialize();

		eventsStub.calledWith(Enums.StateEvent.Starting);
	});

	it("should reset database when CORE_RESET_DATABASE variable is set", async (context) => {
		const genesisBlock = {};

		const databaseState = process.env.CORE_RESET_DATABASE;

		const setSpy = spy(context.stateStore, "setGenesisBlock");
		const stateStoreStub = stub(context.stateStore, "getGenesisBlock").returnValue(genesisBlock);

		const spyOnFromData = stub(Blocks.BlockFactory, "fromData").callsFake((block) => block);

		const databaseInteraction: DatabaseInteraction = context.container.resolve(DatabaseInteraction);

		process.env.CORE_RESET_DATABASE = "1";

		try {
			await databaseInteraction.initialize();

			stateStoreStub.called();
			setSpy.called();
		} finally {
			process.env.CORE_RESET_DATABASE = databaseState;
		}
	});

	it("should terminate app if exception was raised", async (context) => {
		const stateStoreStub = stub(context.stateStore, "setGenesisBlock").callsFake(() => {
			throw new Error("Fail");
		});

		const databaseInteraction: DatabaseInteraction = context.container.resolve(DatabaseInteraction);

		const appSpy = spy(context.app, "terminate");

		await databaseInteraction.initialize();

		appSpy.called();
	});

	it("should terminate if unable to deserialize last 5 blocks", async (context) => {
		stub(Blocks.BlockFactory, "fromJson").callsFake((block) => block);

		const databaseInteraction: DatabaseInteraction = context.container.resolve(DatabaseInteraction);

		const block101data = { id: "block101", height: 101 };
		const block102data = { id: "block102", height: 102 };
		const block103data = { id: "block103", height: 103 };
		const block104data = { id: "block104", height: 104 };
		const block105data = { id: "block105", height: 105 };
		const block106data = { id: "block106", height: 105 };

		const blockRepoLatestStub = stub(context.blockRepository, "findLatest");
		const transRepoStub = stub(context.transactionRepository, "findByBlockIds");
		const setBlockSpy = spy(context.stateStore, "setGenesisBlock");
		const deleteBlockSpy = spy(context.blockRepository, "deleteBlocks");
		const appSpy = spy(context.app, "terminate");

		blockRepoLatestStub.resolvedValueNth(0, block106data);

		blockRepoLatestStub.resolvedValueNth(1, block106data); // this.getLastBlock
		transRepoStub.resolvedValueNth(0, []); // this.getLastBlock

		blockRepoLatestStub.resolvedValueNth(2, block106data); // blockRepository.deleteBlocks
		blockRepoLatestStub.resolvedValueNth(3, block105data); // this.getLastBlock
		transRepoStub.resolvedValueNth(1, []); // this.getLastBlock

		blockRepoLatestStub.resolvedValueNth(4, block105data); // blockRepository.deleteBlocks
		blockRepoLatestStub.resolvedValueNth(5, block104data); // this.getLastBlock
		transRepoStub.resolvedValueNth(2, []); // this.getLastBlock

		blockRepoLatestStub.resolvedValueNth(6, block104data); // blockRepository.deleteBlocks
		blockRepoLatestStub.resolvedValueNth(7, block103data); // this.getLastBlock
		transRepoStub.resolvedValueNth(3, []); // this.getLastBlock

		blockRepoLatestStub.resolvedValueNth(8, block103data); // blockRepository.deleteBlocks
		blockRepoLatestStub.resolvedValueNth(9, block102data); // this.getLastBlock
		transRepoStub.resolvedValueNth(4, []); // this.getLastBlock

		blockRepoLatestStub.resolvedValueNth(10, block102data); // blockRepository.deleteBlocks
		blockRepoLatestStub.resolvedValueNth(11, block101data); // this.getLastBlock
		transRepoStub.resolvedValueNth(5, []); // this.getLastBlock

		await databaseInteraction.initialize();

		setBlockSpy.called();

		blockRepoLatestStub.calledTimes(12);

		transRepoStub.calledNthWith(0, [block106data.id]);

		deleteBlockSpy.calledNthWith(0, [block106data]);
		transRepoStub.calledNthWith(1, [block105data.id]);

		deleteBlockSpy.calledNthWith(1, [block105data]);
		transRepoStub.calledNthWith(2, [block104data.id]);

		deleteBlockSpy.calledNthWith(2, [block104data]);
		transRepoStub.calledNthWith(3, [block103data.id]);

		deleteBlockSpy.calledNthWith(3, [block103data]);
		transRepoStub.calledNthWith(4, [block102data.id]);

		deleteBlockSpy.calledNthWith(4, [block102data]);
		transRepoStub.calledNthWith(5, [block101data.id]);

		appSpy.called();
	});

	it("restoreCurrentRound - should call roundState.restore", async (context) => {
		const roundStateSpy = spy(context.roundState, "restore");

		const databaseInteraction: DatabaseInteraction = context.container.resolve(DatabaseInteraction);

		await databaseInteraction.restoreCurrentRound();

		roundStateSpy.called();
	});

	it("reset - should reset database", async (context) => {
		const genesisBlock = {};
		const connectionSpy = spy(context.connection, "query");
		const stateStoreStub = stub(context.stateStore, "getGenesisBlock").returnValueOnce(genesisBlock);
		const blockRepoSpy = spy(context.blockRepository, "saveBlocks");

		const databaseInteraction: DatabaseInteraction = context.container.resolve(DatabaseInteraction);

		// @ts-ignore
		await databaseInteraction.reset();

		connectionSpy.calledWith("TRUNCATE TABLE blocks, rounds, transactions RESTART IDENTITY;");
		blockRepoSpy.calledWith([genesisBlock]);
	});

	it("applyBlock - should apply block, round, detect missing blocks, and fire events", async (context) => {
		const eventsStub = spy(context.events, "dispatch");
		const blockStateStub = spy(context.blockState, "applyBlock");
		const roundStateStub = spy(context.roundState, "applyBlock");
		const roundStateStub2 = spy(context.roundState, "detectMissedBlocks");

		const databaseInteraction: DatabaseInteraction = context.container.resolve(DatabaseInteraction);

		const spied = spyFn();

		const handler = { emitEvents: spied };

		const handlerStub = stub(context.handlerRegistry, "getActivatedHandlerForData").returnValueOnce(handler);

		const transaction = { data: { id: "dummy_id" } };
		const block = { data: { height: 54, timestamp: 35 }, transactions: [transaction] };
		await databaseInteraction.applyBlock(block as any);

		roundStateStub2.calledWith(block);

		blockStateStub.calledWith(block);
		roundStateStub.calledWith(block);
		assert.true(spied.calledWith(transaction, context.events));
		eventsStub.calledWith(Enums.TransactionEvent.Applied, transaction.data);
		eventsStub.calledWith(Enums.BlockEvent.Applied, block.data);
	});

	it("revertBlock - should revert state, and fire events", async (context) => {
		const eventsStub = spy(context.events, "dispatch");
		const blockStateStub = spy(context.blockState, "revertBlock");
		const roundStateStub = spy(context.roundState, "revertBlock");

		const databaseInteraction: DatabaseInteraction = context.container.resolve(DatabaseInteraction);

		const transaction1 = { data: {} };
		const transaction2 = { data: {} };
		const block = {
			data: { id: "123", height: 100 },
			transactions: [transaction1, transaction2],
		};

		await databaseInteraction.revertBlock(block as any);

		blockStateStub.calledWith(block);
		roundStateStub.calledWith(block);
		eventsStub.calledWith(Enums.TransactionEvent.Reverted, transaction1.data);
		eventsStub.calledWith(Enums.TransactionEvent.Reverted, transaction2.data);
		eventsStub.calledWith(Enums.BlockEvent.Reverted, block.data);
	});
});

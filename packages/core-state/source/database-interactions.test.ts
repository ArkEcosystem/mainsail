import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Enums } from "@arkecosystem/core-kernel";

import { Configuration } from "../../core-crypto-config";
import { DatabaseService } from "../../core-database/source/database-service";
import { describe } from "../../core-test-framework";
import { DatabaseInteraction } from "./database-interactions";

describe<{
	app: any;
	blockFactory: any;
	blockStorage: any;
	blockHeightStorage: any;
	blockState: any;
	connection: any;
	container: Container;
	events: any;
	handlerRegistry: any;
	stateStore: any;
	roundState: any;
	transactionRepository: any;
}>("DatabaseInteractions", ({ it, assert, beforeAll, spy, stub, spyFn }) => {
	beforeAll((context) => {
		context.app = {
			get: () => {},
			terminate: () => {},
		};

		context.connection = {
			close: () => {},
			query: () => {},
		};

		context.blockStorage = {
			count: () => {},
			deleteBlocks: () => {},
			findByHeightRange: () => {},
			findByHeightRangeWithTransactions: () => {},
			findByHeightRangeWithTransactionsForDownload: () => {},
			findByHeights: () => {},
			findByIds: () => {},
			findLatest: () => {},
			findOne: () => {},
			findRecent: () => {},
			findTop: () => {},
			getStatistics: () => {},
			saveBlocks: () => {},
		};

		context.blockHeightStorage = {
			count: () => {},
			deleteBlocks: () => {},
			findByHeightRange: () => {},
			findByHeightRangeWithTransactions: () => {},
			findByHeightRangeWithTransactionsForDownload: () => {},
			findByHeights: () => {},
			findByIds: () => {},
			findLatest: () => {},
			findOne: () => {},
			findRecent: () => {},
			findTop: () => {},
			getStatistics: () => {},
			saveBlocks: () => {},
		};

		context.transactionRepository = {
			find: () => {},
			findByBlockIds: () => {},
			findOne: () => {},
			getStatistics: () => {},
		};

		context.stateStore = {
			getCommonBlocks: () => {},
			getGenesisBlock: () => {},
			getLastBlock: () => {},
			getLastBlockIds: () => {},
			getLastBlocksByHeight: () => {},
			setGenesisBlock: () => {},
			setLastBlock: () => {},
		};

		context.handlerRegistry = {
			getActivatedHandlerForData: () => {},
		};

		context.blockState = {
			applyBlock: () => {},
			revertBlock: () => {},
		};

		context.events = {
			call: () => {},
			dispatch: () => {},
		};

		context.roundState = {
			applyBlock: () => {},
			detectMissedBlocks: () => {},
			getActiveValidators: () => {},
			restore: () => {},
			revertBlock: () => {},
		};

		context.blockFactory = {
			fromData: () => {},
			fromJson: () => {},
		};

		const container = new Container();
		container.bind(Identifiers.Application).toConstantValue(context.app);
		container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

		container.bind(Identifiers.Cryptography.Block.Factory).toConstantValue(context.blockFactory);
		container.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue({});

		// container.bind(Identifiers.DatabaseConnection).toConstantValue(context.connection);
		container.bind(Identifiers.Database.BlockStorage).toConstantValue(context.blockStorage);
		container.bind(Identifiers.Database.BlockHeightStorage).toConstantValue(context.blockHeightStorage);
		container.bind(Identifiers.Database.TransactionStorage).toConstantValue(context.transactionRepository);
		container.bind(Identifiers.Database.RoundStorage).toConstantValue({
			deleteFrom: () => {},
			getRound: () => {},
			save: () => {},
		});
		container.bind(Identifiers.Database.Service).to(DatabaseService);
		container.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		container.bind(Identifiers.StateBlockStore).toConstantValue({
			resize: () => {},
		});
		container.bind(Identifiers.StateTransactionStore).toConstantValue({
			resize: () => {},
		});
		container.bind(Identifiers.TransactionHandlerRegistry).toConstantValue(context.handlerRegistry);
		container.bind(Identifiers.WalletRepository).toConstantValue({
			createWallet: () => {},
			findByPublicKey: () => {},
			findByUsername: () => {},
		});
		container.bind(Identifiers.BlockState).toConstantValue(context.blockState);
		container.bind(Identifiers.DposState).toConstantValue({
			buildValidatorRanking: () => {},
			getRoundValidators: () => {},
			setValidatorsRound: () => {},
		});
		container.bind(Identifiers.DposPreviousRoundStateProvider).toConstantValue(() => {});
		container.bind(Identifiers.TriggerService).toConstantValue({
			call: () => {},
		});
		container.bind(Identifiers.EventDispatcherService).toConstantValue(context.events);

		container.bind(Identifiers.LogService).toConstantValue({
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		});

		container.bind(Identifiers.RoundState).toConstantValue(context.roundState);

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
		stub(context.blockFactory, "fromData").callsFake((block) => block);
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
		stub(context.stateStore, "setGenesisBlock").callsFake(() => {
			throw new Error("Fail");
		});
		const databaseInteraction: DatabaseInteraction = context.container.resolve(DatabaseInteraction);

		const appSpy = spy(context.app, "terminate");

		await databaseInteraction.initialize();

		appSpy.called();
	});

	it.skip("should terminate if unable to deserialize last 5 blocks", async (context) => {
		stub(context.blockFactory, "fromJson").callsFake((block) => block);

		const databaseInteraction = context.container.resolve<DatabaseInteraction>(DatabaseInteraction);

		const block101data = { height: 101, id: "block101" };
		const block102data = { height: 102, id: "block102" };
		const block103data = { height: 103, id: "block103" };
		const block104data = { height: 104, id: "block104" };
		const block105data = { height: 105, id: "block105" };
		const block106data = { height: 106, id: "block106" };

		const blockRepoLatestStub = stub(context.blockStorage, "findLatest");
		const transRepoStub = stub(context.transactionRepository, "findByBlockIds");
		const setBlockSpy = spy(context.stateStore, "setGenesisBlock");
		const deleteBlockSpy = spy(context.blockStorage, "deleteBlocks");
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

	it.skip("reset - should reset database", async (context) => {
		const genesisBlock = {};
		const connectionSpy = spy(context.connection, "query");
		stub(context.stateStore, "getGenesisBlock").returnValueOnce(genesisBlock);
		const blockRepoSpy = spy(context.blockStorage, "saveBlocks");

		const databaseInteraction = context.container.resolve(DatabaseInteraction);

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

		const handler = { emitEvents: () => {} };
		const spied = spy(handler, "emitEvents");
		stub(context.handlerRegistry, "getActivatedHandlerForData").returnValueOnce(handler);
		const transaction = { data: { id: "dummy_id" } };
		const block = { data: { height: 54, timestamp: 35 }, transactions: [transaction] };
		await databaseInteraction.applyBlock(block as any);

		roundStateStub2.calledWith(block);

		blockStateStub.calledWith(block);
		roundStateStub.calledWith(block);
		spied.calledWith(transaction, context.events);
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
			data: { height: 100, id: "123" },
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

import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { RollbackDatabase } from "./rollback-database";

describe<{
	container: Container.Container;
	logger: any;
	application: any;
	blockchain: any;
	stateStore: any;
	databaseService: any;
	mapConfiguration: any;
	configuration: any;
}>("RollbackDatabase", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.blockchain = {
			dispatch: () => undefined,
			removeTopBlocks: () => undefined,
		};
		context.stateStore = {
			setRestoredDatabaseIntegrity: () => undefined,
			setLastBlock: () => undefined,
			setLastStoredBlockHeight: () => undefined,
		};
		context.databaseService = {
			verifyBlockchain: () => undefined,
			getLastBlock: () => undefined,
		};
		context.mapConfiguration = {
			"databaseRollback.maxBlockRewind": 20,
			"databaseRollback.steps": 5,
		};
		context.configuration = { getRequired: (key) => context.mapConfiguration[key] };

		context.application = { get: () => undefined };

		context.logger = {
			warning: () => undefined,
			debug: () => undefined,
			info: () => undefined,
			error: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Container.Identifiers.DatabaseService).toConstantValue(context.databaseService);
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Container.Identifiers.PluginConfiguration).toConstantValue(context.configuration);
	});

	it("should remove top blocks until databaseService.verifyBlockchain()", async (context) => {
		const rollbackDatabase = context.container.resolve<RollbackDatabase>(RollbackDatabase);

		const lastBlock = {
			data: {
				id: "123",
				height: 5556,
			},
		};
		const lastBlockAfterRollback = {
			data: {
				id: "122",
				height: 5536,
			},
		};

		stub(context.databaseService, "getLastBlock")
			.returnValueNth(0, lastBlock)
			.returnValueNth(1, lastBlockAfterRollback);
		const verifyBlockchainStub = stub(context.databaseService, "verifyBlockchain")
			.returnValueNth(0, false)
			.returnValueNth(1, false)
			.returnValueNth(2, false)
			.returnValueNth(3, true); // returns false 3 times then true
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setRestoredDatabaseIntegritySpy = spy(context.stateStore, "setRestoredDatabaseIntegrity");
		const setLastBlockSpy = spy(context.stateStore, "setLastBlock");
		const setLastStoredBlockHeightSpy = spy(context.stateStore, "setLastStoredBlockHeight");

		await rollbackDatabase.handle();

		verifyBlockchainStub.calledTimes(4);
		setRestoredDatabaseIntegritySpy.calledWith(true);
		setLastBlockSpy.calledWith(lastBlockAfterRollback);
		setLastStoredBlockHeightSpy.calledWith(lastBlockAfterRollback.data.height);
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("SUCCESS");
	});

	it("should dispatch FAILURE when !databaseService.verifyBlockchain() after trying according to maxBlockRewind and steps", async (context) => {
		const rollbackDatabase = context.container.resolve<RollbackDatabase>(RollbackDatabase);

		const lastBlock = {
			data: {
				id: "123",
				height: 5556,
			},
		};

		stub(context.databaseService, "getLastBlock").returnValue(lastBlock);
		const verifyBlockchainStub = stub(context.databaseService, "verifyBlockchain").returnValue(false);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setRestoredDatabaseIntegritySpy = spy(context.stateStore, "setRestoredDatabaseIntegrity");
		const setLastBlockSpy = spy(context.stateStore, "setLastBlock");
		const setLastStoredBlockHeightSpy = spy(context.stateStore, "setLastStoredBlockHeight");

		await rollbackDatabase.handle();

		verifyBlockchainStub.calledTimes(4);
		setRestoredDatabaseIntegritySpy.neverCalled();
		setLastBlockSpy.neverCalled();
		setLastStoredBlockHeightSpy.neverCalled();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("FAILURE");
	});

	it("should dispatch FAILURE when !databaseService.verifyBlockchain() after rollback to genesisBlock", async (context) => {
		const rollbackDatabase = context.container.resolve<RollbackDatabase>(RollbackDatabase);

		const lastBlock = {
			data: {
				id: "123",
				height: 3,
			},
		};

		stub(context.databaseService, "getLastBlock").returnValue(lastBlock);
		const verifyBlockchainStub = stub(context.databaseService, "verifyBlockchain").returnValue(false);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const setRestoredDatabaseIntegritySpy = spy(context.stateStore, "setRestoredDatabaseIntegrity");
		const setLastBlockSpy = spy(context.stateStore, "setLastBlock");
		const setLastStoredBlockHeightSpy = spy(context.stateStore, "setLastStoredBlockHeight");

		await rollbackDatabase.handle();

		verifyBlockchainStub.calledTimes(1);
		setRestoredDatabaseIntegritySpy.neverCalled();
		setLastBlockSpy.neverCalled();
		setLastStoredBlockHeightSpy.neverCalled();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("FAILURE");
	});
});

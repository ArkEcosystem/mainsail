import { Container } from "@mainsail/core-container";
import { Constants, Identifiers } from "@mainsail/core-contracts";
import { Utils } from "@mainsail/core-kernel";

// import { Managers } from "@mainsail/crypto";
import { describe } from "../../../../core-test-framework";
import { Initialize } from "./initialize";

describe<{
	container: Container;
	application: any;
	logger: any;
	blockchain: any;
	stateStore: any;
	transactionPool: any;
	databaseService: any;
	databaseInteractions: any;
	peerNetworkMonitor: any;
	stateBuilder: any;
	configuration: any;
}>("Initialize", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			notice: () => {},
			warning: () => {},
		};
		context.blockchain = {
			dispatch: () => {},
		};
		context.stateStore = {
			getLastBlock: () => {},
			getNetworkStart: () => false,
			getRestoredDatabaseIntegrity: () => false,
			setLastBlock: () => {},
		};
		context.transactionPool = {
			readdTransactions: () => {},
		};
		context.databaseService = {
			deleteRound: () => {},
			verifyBlockchain: () => {},
		};
		context.databaseInteractions = {
			applyBlock: () => {},
			deleteRound: () => {},
			getActiveDelegates: () => [],
			getLastBlock: () => {},
			getTopBlocks: () => {},
			loadBlocksFromCurrentRound: () => {},
			restoreCurrentRound: () => {},
			revertBlock: () => {},
			walletRepository: {
				getNonce: () => {},
			},
		};
		context.peerNetworkMonitor = {
			boot: () => {},
		};
		context.stateBuilder = {
			run: () => {},
		};

		context.configuration = {
			get: () => {},
		};

		const appGet = {
			[Identifiers.PeerNetworkMonitor]: context.peerNetworkMonitor,
			[Identifiers.StateBuilder]: context.stateBuilder,
		};
		context.application = { get: (key) => appGet[key] };

		context.container = new Container();
		context.container.bind(Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Identifiers.Database.Service).toConstantValue(context.databaseService);
		context.container.bind(Identifiers.DatabaseInteraction).toConstantValue(context.databaseInteractions);
		context.container.bind(Identifiers.TransactionPoolService).toConstantValue(context.transactionPool);
		context.container.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Identifiers.PeerNetworkMonitor).toConstantValue(context.peerNetworkMonitor);
		context.container.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
	});

	it("when stateStore.getRestoredDatabaseIntegrity should initialize state, database, transaction pool and peer network monitor", async (context) => {
		const initialize = context.container.resolve<Initialize>(Initialize);

		const lastBlock = {
			data: {
				height: 5554,
				id: "345",
			},
		};
		stub(Utils.roundCalculator, "calculateRound").returnValue({ round: 1 });
		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.stateStore, "getRestoredDatabaseIntegrity").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const deleteRoundSpy = spy(context.databaseService, "deleteRound");
		const restoreCurrentRoundSpy = spy(context.databaseInteractions, "restoreCurrentRound");
		const readdTransactionsSpy = spy(context.transactionPool, "readdTransactions");
		const bootSpy = spy(context.peerNetworkMonitor, "boot");
		const runSpy = spy(context.stateBuilder, "run");

		process.env.NODE_ENV = "";

		await initialize.handle();

		deleteRoundSpy.calledOnce();
		restoreCurrentRoundSpy.calledOnce();
		readdTransactionsSpy.calledOnce();
		bootSpy.calledOnce();
		runSpy.calledOnce();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("STARTED");
	});

	it("when !stateStore.getRestoredDatabaseIntegrity should dispatch ROLLBACK when databaseService.verifyBlockchain() returns false", async (context) => {
		const initialize = context.container.resolve<Initialize>(Initialize);

		const lastBlock = {
			data: {
				height: 5554,
				id: "345",
			},
		};

		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.databaseService, "verifyBlockchain").returnValue(false);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		process.env.NODE_ENV = "";
		await initialize.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("ROLLBACK");
	});

	it("when !stateStore.getRestoredDatabaseIntegrity should dispatch STARTED when databaseService.verifyBlockchain() returns true", async (context) => {
		const initialize = context.container.resolve<Initialize>(Initialize);

		const lastBlock = {
			data: {
				height: 5554,
				id: "345",
			},
		};
		stub(Utils.roundCalculator, "calculateRound").returnValue({ round: 1 });
		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.databaseService, "verifyBlockchain").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		process.env.NODE_ENV = "";
		await initialize.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("STARTED");
	});

	it("when block.data.height === 1 should dispatch FAILURE when block payloadHash is !== network hash", async (context) => {
		const initialize = context.container.resolve<Initialize>(Initialize);

		const lastBlock = {
			data: {
				height: 1,
				id: "345",
				payloadHash: "6d84d08bd299ed97c212c886c98a57e36545c8f5d645ca7eeae63a8bd62d8988",
			},
		};
		stub(context.configuration, "get").returnValue("dummyPayloadHash");
		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.stateStore, "getRestoredDatabaseIntegrity").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		process.env.NODE_ENV = "";
		await initialize.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("FAILURE");
	});

	it("when block.data.height === 1 should dispatch STARTED and databaseService.deleteRound(1) when block payloadHash === network hash", async (context) => {
		const initialize = context.container.resolve<Initialize>(Initialize);

		const lastBlock = {
			data: {
				height: 1,
				id: "345",
				payloadHash: "6d84d08bd299ed97c212c886c98a57e36545c8f5d645ca7eeae63a8bd62d8988",
			},
		};
		stub(context.configuration, "get").returnValue(
			"6d84d08bd299ed97c212c886c98a57e36545c8f5d645ca7eeae63a8bd62d8988",
		);
		stub(Utils.roundCalculator, "calculateRound").returnValue({ round: 1 });
		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.stateStore, "getRestoredDatabaseIntegrity").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const deleteRoundSpy = spy(context.databaseService, "deleteRound");

		process.env.NODE_ENV = "";
		await initialize.handle();

		deleteRoundSpy.calledWith(1);
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("STARTED");
	});

	it("when stateStore.networkStart should dispatch STARTED", async (context) => {
		const initialize = context.container.resolve<Initialize>(Initialize);

		const lastBlock = {
			data: {
				height: 334,
				id: "345",
			},
		};
		stub(Utils.roundCalculator, "calculateRound").returnValue({ round: 1 });
		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.stateStore, "getNetworkStart").returnValue(true);
		stub(context.stateStore, "getRestoredDatabaseIntegrity").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		process.env.NODE_ENV = "";
		await initialize.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("STARTED");
	});

	it("when process.env.CORE_ENV === 'test' should dispatch STARTED", async (context) => {
		const initialize = context.container.resolve<Initialize>(Initialize);

		const lastBlock = {
			data: {
				height: 334,
				id: "345",
			},
		};
		stub(Utils.roundCalculator, "calculateRound").returnValue({ round: 1 });
		stub(context.stateStore, "getLastBlock").returnValue(lastBlock);
		stub(context.stateStore, "getNetworkStart").returnValue(false);
		stub(context.stateStore, "getRestoredDatabaseIntegrity").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");
		const deleteRoundSpy = spy(context.databaseService, "deleteRound");
		const restoreCurrentRoundSpy = spy(context.databaseInteractions, "restoreCurrentRound");
		const readdTransactionsSpy = spy(context.transactionPool, "readdTransactions");
		const bootSpy = spy(context.peerNetworkMonitor, "boot");
		const runSpy = spy(context.stateBuilder, "run");

		process.env[Constants.Flags.CORE_ENV] = "test";
		await initialize.handle();

		deleteRoundSpy.calledOnce();
		restoreCurrentRoundSpy.calledOnce();
		readdTransactionsSpy.neverCalled();
		bootSpy.calledOnce();
		runSpy.calledOnce();
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("STARTED");
	});

	it("when something throws an exception should dispatch FAILURE", async (context) => {
		const initialize = context.container.resolve<Initialize>(Initialize);

		stub(Utils.roundCalculator, "calculateRound").returnValue({ round: 1 });
		stub(context.stateStore, "getLastBlock").callsFake(() => new Error("oops"));
		stub(context.stateStore, "getRestoredDatabaseIntegrity").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		process.env.NODE_ENV = "";
		await initialize.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("FAILURE");
	});
});

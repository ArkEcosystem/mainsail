import { Initialize } from "@packages/core-blockchain/source/state-machine/actions/initialize";
import { Container } from "@packages/core-kernel";
import { Managers } from "@packages/crypto";

describe("Initialize", () => {
	const container = new Container.Container();

	const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), notice: jest.fn(), warning: jest.fn() };
	const blockchain = { dispatch: jest.fn() };
	const stateStore = {
		getLastBlock: jest.fn(),
		getNetworkStart: jest.fn().mockReturnValue(false),
		getRestoredDatabaseIntegrity: jest.fn().mockReturnValue(false),
		setLastBlock: jest.fn(),
	};
	const transactionPool = { readdTransactions: jest.fn() };
	const databaseService = {
		deleteRound: jest.fn(),
		verifyBlockchain: jest.fn(),
	};
	const databaseInteractions = {
		applyBlock: jest.fn(),
		deleteRound: jest.fn(),
		getActiveDelegates: jest.fn().mockReturnValue([]),
		getLastBlock: jest.fn(),
		getTopBlocks: jest.fn(),
		loadBlocksFromCurrentRound: jest.fn(),
		restoreCurrentRound: jest.fn(),
		revertBlock: jest.fn(),
		walletRepository: {
			getNonce: jest.fn(),
		},
	};
	const peerNetworkMonitor = { boot: jest.fn() };
	const stateBuilder = { run: jest.fn() };

	const appGet = {
		[Identifiers.PeerNetworkMonitor]: peerNetworkMonitor,
		[Identifiers.StateBuilder]: stateBuilder,
	};
	const application = { get: (key) => appGet[key] };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.Application).toConstantValue(application);
		container.bind(Identifiers.LogService).toConstantValue(logger);
		container.bind(Identifiers.DatabaseService).toConstantValue(databaseService);
		container.bind(Identifiers.DatabaseInteraction).toConstantValue(databaseInteractions);
		container.bind(Identifiers.TransactionPoolService).toConstantValue(transactionPool);
		container.bind(Identifiers.StateStore).toConstantValue(stateStore);
		container.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
		container.bind(Identifiers.PeerNetworkMonitor).toConstantValue(peerNetworkMonitor);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("handle", () => {
		describe("when stateStore.getRestoredDatabaseIntegrity", () => {
			it("should initialize state, database, transaction pool and peer network monitor", async () => {
				const initialize = container.resolve<Initialize>(Initialize);

				const lastBlock = {
					data: {
						height: 5554,
						id: "345",
					},
				};
				stateStore.getLastBlock = jest.fn().mockReturnValueOnce(lastBlock);
				stateStore.getRestoredDatabaseIntegrity = jest.fn().mockReturnValue(true);
				process.env.NODE_ENV = "";
				await initialize.handle();

				expect(databaseService.deleteRound).toHaveBeenCalledTimes(1);
				expect(databaseInteractions.restoreCurrentRound).toHaveBeenCalledTimes(1);
				expect(transactionPool.readdTransactions).toHaveBeenCalledTimes(1);
				expect(peerNetworkMonitor.boot).toHaveBeenCalledTimes(1);
				expect(stateBuilder.run).toHaveBeenCalledTimes(1);
				expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
				expect(blockchain.dispatch).toHaveBeenCalledWith("STARTED");
			});
		});

		describe("when !stateStore.getRestoredDatabaseIntegrity", () => {
			it("should dispatch ROLLBACK when databaseService.verifyBlockchain() returns false", async () => {
				const initialize = container.resolve<Initialize>(Initialize);

				const lastBlock = {
					data: {
						height: 5554,
						id: "345",
					},
				};
				stateStore.getLastBlock = jest.fn().mockReturnValueOnce(lastBlock);
				databaseService.verifyBlockchain = jest.fn().mockReturnValueOnce(false);
				process.env.NODE_ENV = "";
				await initialize.handle();

				expect(blockchain.dispatch).toHaveBeenCalledWith("ROLLBACK");
			});

			it("should dispatch STARTED when databaseService.verifyBlockchain() returns true", async () => {
				const initialize = container.resolve<Initialize>(Initialize);

				const lastBlock = {
					data: {
						height: 5554,
						id: "345",
					},
				};
				stateStore.getLastBlock = jest.fn().mockReturnValueOnce(lastBlock);
				databaseService.verifyBlockchain = jest.fn().mockReturnValueOnce(true);
				process.env.NODE_ENV = "";
				await initialize.handle();

				expect(blockchain.dispatch).toHaveBeenCalledWith("STARTED");
			});
		});

		describe("when block.data.height === 1", () => {
			it("should dispatch FAILURE when block payloadHash is !== network hash", async () => {
				const initialize = container.resolve<Initialize>(Initialize);

				const lastBlock = {
					data: {
						height: 1,
						id: "345",
						payloadHash: "6d84d08bd299ed97c212c886c98a57e36545c8f5d645ca7eeae63a8bd62d8988",
					},
				};
				stateStore.getLastBlock = jest.fn().mockReturnValueOnce(lastBlock);
				stateStore.getRestoredDatabaseIntegrity = jest.fn().mockReturnValue(true);
				process.env.NODE_ENV = "";
				await initialize.handle();

				expect(blockchain.dispatch).toHaveBeenCalledWith("FAILURE");
			});

			it("should dispatch STARTED and databaseService.deleteRound(1) when block payloadHash === network hash", async () => {
				const initialize = container.resolve<Initialize>(Initialize);

				const lastBlock = {
					data: {
						height: 1,
						id: "345",
						payloadHash: Managers.configManager.get("network.nethash"),
					},
				};
				stateStore.getLastBlock = jest.fn().mockReturnValueOnce(lastBlock);
				stateStore.getRestoredDatabaseIntegrity = jest.fn().mockReturnValue(true);
				process.env.NODE_ENV = "";
				await initialize.handle();

				expect(databaseService.deleteRound).toHaveBeenCalledWith(1);
				expect(blockchain.dispatch).toHaveBeenCalledWith("STARTED");
			});
		});

		describe("when stateStore.networkStart", () => {
			it("should dispatch STARTED", async () => {
				const initialize = container.resolve<Initialize>(Initialize);

				const lastBlock = {
					data: {
						height: 334,
						id: "345",
						payloadHash: Managers.configManager.get("network.nethash"),
					},
				};
				stateStore.getLastBlock = jest.fn().mockReturnValueOnce(lastBlock);
				stateStore.getNetworkStart = jest.fn().mockReturnValue(true);
				stateStore.getRestoredDatabaseIntegrity = jest.fn().mockReturnValue(true);
				process.env.NODE_ENV = "";
				await initialize.handle();

				expect(blockchain.dispatch).toHaveBeenCalledWith("STARTED");
			});
		});

		describe("when process.env.NODE_ENV === 'test'", () => {
			it("should dispatch STARTED", async () => {
				const initialize = container.resolve<Initialize>(Initialize);

				const lastBlock = {
					data: {
						height: 334,
						id: "345",
						payloadHash: Managers.configManager.get("network.nethash"),
					},
				};
				stateStore.getLastBlock = jest.fn().mockReturnValueOnce(lastBlock);
				stateStore.getNetworkStart = jest.fn().mockReturnValue(false);
				stateStore.getRestoredDatabaseIntegrity = jest.fn().mockReturnValue(true);
				process.env.NODE_ENV = "test";
				await initialize.handle();

				expect(databaseService.deleteRound).toHaveBeenCalledTimes(1);
				expect(databaseInteractions.restoreCurrentRound).toHaveBeenCalledTimes(1);
				expect(transactionPool.readdTransactions).toHaveBeenCalledTimes(0);
				expect(peerNetworkMonitor.boot).toHaveBeenCalledTimes(1);
				expect(stateBuilder.run).toHaveBeenCalledTimes(1);
				expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
				expect(blockchain.dispatch).toHaveBeenCalledWith("STARTED");
			});
		});

		describe("when something throws an exception", () => {
			it("should dispatch FAILURE", async () => {
				const initialize = container.resolve<Initialize>(Initialize);

				stateStore.getLastBlock = jest.fn().mockImplementationOnce(() => {
					throw new Error("oops");
				});
				stateStore.getRestoredDatabaseIntegrity = jest.fn().mockReturnValue(true);
				process.env.NODE_ENV = "";
				await initialize.handle();

				expect(blockchain.dispatch).toHaveBeenCalledWith("FAILURE");
			});
		});
	});
});

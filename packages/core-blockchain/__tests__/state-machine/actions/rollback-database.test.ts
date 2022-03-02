import { Container } from "@arkecosystem/core-kernel";
import { RollbackDatabase } from "@packages/core-blockchain/source/state-machine/actions/rollback-database";

describe("RollbackDatabase", () => {
	const container = new Container.Container();

	const logger = { debug: jest.fn(), info: jest.fn(), warning: jest.fn() };
	const blockchain = {
		dispatch: jest.fn(),
		removeTopBlocks: jest.fn(),
	};
	const stateStore = {
		setLastBlock: jest.fn(),
		setLastStoredBlockHeight: jest.fn(),
		setRestoredDatabaseIntegrity: jest.fn(),
	};
	const databaseService = {
		getLastBlock: jest.fn(),
		verifyBlockchain: jest.fn(),
	};
	const mapConfiguration = {
		"databaseRollback.maxBlockRewind": 20,
		"databaseRollback.steps": 5,
	};
	const configuration = { getRequired: (key) => mapConfiguration[key] };

	const application = { get: jest.fn() };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.Application).toConstantValue(application);
		container.bind(Identifiers.LogService).toConstantValue(logger);
		container.bind(Identifiers.StateStore).toConstantValue(stateStore);
		container.bind(Identifiers.DatabaseService).toConstantValue(databaseService);
		container.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
		container.bind(Identifiers.PluginConfiguration).toConstantValue(configuration);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("handle", () => {
		it("should remove top blocks until databaseService.verifyBlockchain()", async () => {
			const rollbackDatabase = container.resolve<RollbackDatabase>(RollbackDatabase);

			const lastBlock = {
				data: {
					height: 5556,
					id: "123",
				},
			};
			const lastBlockAfterRollback = {
				data: {
					height: 5536,
					id: "122",
				},
			};
			databaseService.getLastBlock = jest
				.fn()
				.mockReturnValueOnce(lastBlock)
				.mockReturnValueOnce(lastBlockAfterRollback);
			databaseService.verifyBlockchain = jest
				.fn()
				.mockReturnValueOnce(false)
				.mockReturnValueOnce(false)
				.mockReturnValueOnce(false)
				.mockReturnValueOnce(true); // returns false 3 times then true
			await rollbackDatabase.handle();

			expect(databaseService.verifyBlockchain).toHaveBeenCalledTimes(4);
			expect(stateStore.setRestoredDatabaseIntegrity).toHaveBeenCalledWith(true);
			expect(stateStore.setLastBlock).toHaveBeenCalledWith(lastBlockAfterRollback);
			expect(stateStore.setLastStoredBlockHeight).toHaveBeenCalledWith(lastBlockAfterRollback.data.height);
			expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenCalledWith("SUCCESS");
		});

		it("should dispatch FAILURE when !databaseService.verifyBlockchain() after trying according to maxBlockRewind and steps", async () => {
			const rollbackDatabase = container.resolve<RollbackDatabase>(RollbackDatabase);

			const lastBlock = {
				data: {
					height: 5556,
					id: "123",
				},
			};
			databaseService.getLastBlock = jest.fn().mockReturnValueOnce(lastBlock);
			databaseService.verifyBlockchain = jest.fn().mockReturnValue(false);
			await rollbackDatabase.handle();

			expect(databaseService.verifyBlockchain).toHaveBeenCalledTimes(4);
			expect(stateStore.setRestoredDatabaseIntegrity).not.toHaveBeenCalled();
			expect(stateStore.setLastBlock).not.toHaveBeenCalled();
			expect(stateStore.setLastStoredBlockHeight).not.toHaveBeenCalled();
			expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenCalledWith("FAILURE");
		});

		it("should dispatch FAILURE when !databaseService.verifyBlockchain() after rollback to genesisBlock", async () => {
			const rollbackDatabase = container.resolve<RollbackDatabase>(RollbackDatabase);

			const lastBlock = {
				data: {
					height: 3,
					id: "123",
				},
			};
			databaseService.getLastBlock = jest.fn().mockReturnValueOnce(lastBlock);
			databaseService.verifyBlockchain = jest.fn().mockReturnValue(false);
			await rollbackDatabase.handle();

			expect(databaseService.verifyBlockchain).toHaveBeenCalledTimes(1);
			expect(stateStore.setRestoredDatabaseIntegrity).not.toHaveBeenCalled();
			expect(stateStore.setLastBlock).not.toHaveBeenCalled();
			expect(stateStore.setLastStoredBlockHeight).not.toHaveBeenCalled();
			expect(blockchain.dispatch).toHaveBeenCalledTimes(1);
			expect(blockchain.dispatch).toHaveBeenCalledWith("FAILURE");
		});
	});
});

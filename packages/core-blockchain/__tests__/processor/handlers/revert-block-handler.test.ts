import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";
import { BlockProcessorResult } from "@packages/core-blockchain/source/processor";
import { RevertBlockHandler } from "@packages/core-blockchain/source/processor/handlers/revert-block-handler";

describe("AcceptBlockHandler", () => {
	const container = new Container.Container();

	const logger = { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() };
	const state = {
		getLastBlocks: jest.fn(),
		setLastBlock: jest.fn(),
	};
	const transactionPool = { addTransaction: jest.fn() };
	const databaseInteractions = {
		revertBlock: jest.fn(),
	};
	const databaseService = {
		getLastBlock: jest.fn(),
	};

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.LogService).toConstantValue(logger);
		container.bind(Identifiers.StateStore).toConstantValue(state);
		container.bind(Identifiers.DatabaseInteraction).toConstantValue(databaseInteractions);
		container.bind(Identifiers.DatabaseService).toConstantValue(databaseService);
		container.bind(Identifiers.TransactionPoolService).toConstantValue(transactionPool);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("execute", () => {
		const block = {
			data: { height: 5544, id: "1222" },
			transactions: [{ id: "11" }, { id: "12" }],
		};
		const previousBlock = {
			data: { height: 5543, id: "1221" },
			transactions: [{ id: "11" }, { id: "12" }],
		};

		const randomBlock = {
			data: { height: 5540, id: "123" },
			transactions: [{ id: "11" }, { id: "12" }],
		};

		it("should revert block, transactions and resetLastDownloadedBlock", async () => {
			state.getLastBlocks.mockReturnValue([previousBlock]);

			const acceptBlockHandler = container.resolve<RevertBlockHandler>(RevertBlockHandler);

			const result = await acceptBlockHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.Reverted);

			expect(databaseInteractions.revertBlock).toBeCalledTimes(1);
			expect(databaseInteractions.revertBlock).toHaveBeenCalledWith(block);

			expect(transactionPool.addTransaction).toBeCalledTimes(2);
			expect(transactionPool.addTransaction).toHaveBeenCalledWith(block.transactions[0]);
			expect(transactionPool.addTransaction).toHaveBeenCalledWith(block.transactions[1]);

			expect(databaseService.getLastBlock).not.toHaveBeenCalled();
			expect(state.setLastBlock).toHaveBeenCalledWith(previousBlock);
		});

		it("should take previous block from database if state is empty", async () => {
			state.getLastBlocks.mockReturnValue([]);
			databaseService.getLastBlock.mockResolvedValue(previousBlock);

			const acceptBlockHandler = container.resolve<RevertBlockHandler>(RevertBlockHandler);

			const result = await acceptBlockHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.Reverted);

			expect(databaseInteractions.revertBlock).toBeCalledTimes(1);
			expect(databaseInteractions.revertBlock).toHaveBeenCalledWith(block);

			expect(transactionPool.addTransaction).toBeCalledTimes(2);
			expect(transactionPool.addTransaction).toHaveBeenCalledWith(block.transactions[0]);
			expect(transactionPool.addTransaction).toHaveBeenCalledWith(block.transactions[1]);

			expect(databaseService.getLastBlock).toHaveBeenCalledTimes(1);
			expect(state.setLastBlock).toHaveBeenCalledWith(previousBlock);
		});

		it("should return Corrupted if revertBlock throws", async () => {
			state.getLastBlocks.mockReturnValue([]);
			databaseInteractions.revertBlock.mockImplementation(() => {
				throw new Error();
			});

			const acceptBlockHandler = container.resolve<RevertBlockHandler>(RevertBlockHandler);

			const result = await acceptBlockHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.Corrupted);
		});

		it("should return Corrupted if block is not following previous block", async () => {
			state.getLastBlocks.mockReturnValue([]);
			databaseService.getLastBlock.mockResolvedValue(randomBlock);

			const acceptBlockHandler = container.resolve<RevertBlockHandler>(RevertBlockHandler);

			const result = await acceptBlockHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.Corrupted);

			expect(databaseInteractions.revertBlock).toBeCalledTimes(1);
			expect(databaseInteractions.revertBlock).toHaveBeenCalledWith(block);

			expect(transactionPool.addTransaction).toBeCalledTimes(2);
			expect(transactionPool.addTransaction).toHaveBeenCalledWith(block.transactions[0]);
			expect(transactionPool.addTransaction).toHaveBeenCalledWith(block.transactions[1]);

			expect(databaseService.getLastBlock).toHaveBeenCalledTimes(1);
			expect(state.setLastBlock).not.toHaveBeenCalled();
		});
	});
});

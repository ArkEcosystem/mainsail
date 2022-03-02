import { BlockProcessorResult } from "@packages/core-blockchain/source/processor";
import { AcceptBlockHandler } from "@packages/core-blockchain/source/processor/handlers/accept-block-handler";
import { ExceptionHandler } from "@packages/core-blockchain/source/processor/handlers/exception-handler";
import { Container } from "@packages/core-kernel";
import { Interfaces } from "@packages/crypto";

describe("ExceptionHandler", () => {
	const container = new Container.Container();

	const logger = { debug: jest.fn(), info: jest.fn(), warning: jest.fn() };
	const blockchain = { getLastBlock: jest.fn(), resetLastDownloadedBlock: jest.fn() };
	const databaseInterceptor = { getBlock: jest.fn() };
	const application = { resolve: jest.fn() };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.Application).toConstantValue(application);
		container.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
		container.bind(Identifiers.LogService).toConstantValue(logger);
		container.bind(Identifiers.DatabaseInterceptor).toConstantValue(databaseInterceptor);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("execute", () => {
		const block = { data: { height: 4445, id: "123" } };

		it("should return Rejected and resetLastDownloadedBlock if block is already forged", async () => {
			const exceptionHandler = container.resolve<ExceptionHandler>(ExceptionHandler);

			databaseInterceptor.getBlock = jest.fn().mockResolvedValueOnce(block);
			const result = await exceptionHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.Rejected);

			expect(blockchain.resetLastDownloadedBlock).toBeCalledTimes(1);
		});

		it("should return Rejected and resetLastDownloadedBlock if block height it not sequential", async () => {
			const exceptionHandler = container.resolve<ExceptionHandler>(ExceptionHandler);

			const notSequentialLastBlock = { data: { height: 3333, id: "122" } };
			blockchain.getLastBlock.mockReturnValueOnce(notSequentialLastBlock);

			const result = await exceptionHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.Rejected);

			expect(blockchain.resetLastDownloadedBlock).toBeCalledTimes(1);
		});

		it("should call AcceptHandler if block is not forged yet and height is sequential", async () => {
			const exceptionHandler = container.resolve<ExceptionHandler>(ExceptionHandler);

			const mockAcceptHandler = {
				execute: () => BlockProcessorResult.Accepted,
			};
			application.resolve = jest.fn().mockReturnValue(mockAcceptHandler);

			const lastBlock = { data: { height: 4444, id: "122" } };
			blockchain.getLastBlock.mockReturnValueOnce(lastBlock);

			const result = await exceptionHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.Accepted);

			expect(application.resolve).toBeCalledTimes(1);
			expect(application.resolve).toBeCalledWith(AcceptBlockHandler);
		});
	});
});

import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";
import { BlockProcessorResult } from "@packages/core-blockchain/source/processor";
import { AlreadyForgedHandler } from "@packages/core-blockchain/source/processor/handlers/already-forged-handler";

describe("AlreadyForgedHandler", () => {
	const container = new Container.Container();

	const blockchain = { resetLastDownloadedBlock: jest.fn() };

	const application = { get: jest.fn() };

	beforeAll(() => {
		container.unbindAll();
		container.bind(Identifiers.Application).toConstantValue(application);
		container.bind(Identifiers.BlockchainService).toConstantValue(blockchain);
	});

	beforeEach(() => {
		jest.resetAllMocks();
	});

	describe("execute", () => {
		it("should call blockchain.resetLastDownloadedBlock and return DiscardedButCanBeBroadcasted", async () => {
			const alreadyForgedHandler = container.resolve<AlreadyForgedHandler>(AlreadyForgedHandler);

			const block = {};
			const result = await alreadyForgedHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.DiscardedButCanBeBroadcasted);
			expect(blockchain.resetLastDownloadedBlock).toBeCalledTimes(1);
		});
	});
});

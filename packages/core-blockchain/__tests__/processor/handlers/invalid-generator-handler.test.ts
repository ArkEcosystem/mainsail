import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";

import { BlockProcessorResult } from "../../../source/processor";
import { InvalidGeneratorHandler } from "../../../source/processor/handlers/invalid-generator-handler";

describe("InvalidGeneratorHandler", () => {
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
			const invalidGeneratorHandler = container.resolve<InvalidGeneratorHandler>(InvalidGeneratorHandler);

			const block = {};
			const result = await invalidGeneratorHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.Rejected);
			expect(blockchain.resetLastDownloadedBlock).toBeCalledTimes(1);
		});
	});
});

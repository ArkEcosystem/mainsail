import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";

import { BlockProcessorResult } from "../../../source/processor";
import { VerificationFailedHandler } from "../../../source/processor/handlers/verification-failed-handler";

describe("VerificationFailedHandler", () => {
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
			const verificationFailedHandler = container.resolve<VerificationFailedHandler>(VerificationFailedHandler);

			const block = {};
			const result = await verificationFailedHandler.execute(block as Crypto.IBlock);

			expect(result).toBe(BlockProcessorResult.Rejected);
			expect(blockchain.resetLastDownloadedBlock).toBeCalledTimes(1);
		});
	});
});

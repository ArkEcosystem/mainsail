import { Interfaces } from "@arkecosystem/crypto";
import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { BlockProcessorResult } from "../contracts";
import { VerificationFailedHandler } from "./verification-failed-handler";

describe<{
	container: Container.Container;
	blockchain: any;
	application: any;
}>("VerificationFailedHandler", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.blockchain = {
			resetLastDownloadedBlock: () => undefined,
		};
		context.application = {
			get: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
	});

	it("should call blockchain.resetLastDownloadedBlock and return DiscardedButCanBeBroadcasted", async (context) => {
		const verificationFailedHandler =
			context.container.resolve<VerificationFailedHandler>(VerificationFailedHandler);

		const resetLastDownloadedBlockSpy = spy(context.blockchain, "resetLastDownloadedBlock");

		const block = {};
		const result = await verificationFailedHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
		resetLastDownloadedBlockSpy.calledOnce();
	});
});

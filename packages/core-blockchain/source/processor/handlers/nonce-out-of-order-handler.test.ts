import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";
import { describe } from "../../../../core-test-framework";

import { BlockProcessorResult } from "../contracts";
import { NonceOutOfOrderHandler } from "./nonce-out-of-order-handler";

describe<{
	container: Container.Container;
	blockchain: any;
	application: any;
}>("NonceOutOfOrderHandler", ({ assert, beforeEach, it, spy }) => {
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
		const nonceOutOfOrderHandler = context.container.resolve<NonceOutOfOrderHandler>(NonceOutOfOrderHandler);

		const resetLastDownloadedBlockSpy = spy(context.blockchain, "resetLastDownloadedBlock");

		const block = {};
		const result = await nonceOutOfOrderHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
		resetLastDownloadedBlockSpy.calledOnce();
	});
});

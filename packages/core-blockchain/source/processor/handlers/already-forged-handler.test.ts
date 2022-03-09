import { Container } from "@arkecosystem/core-kernel";
import { Interfaces } from "@arkecosystem/crypto";
import { describe } from "../../../../core-test-framework";

import { BlockProcessorResult } from "../contracts";
import { AlreadyForgedHandler } from "./already-forged-handler";

describe<{
	container: Container.Container;
	blockchain: any;
	application: any;
}>("AlreadyForgedHandler", ({ assert, beforeEach, it, spy }) => {
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
		const alreadyForgedHandler = context.container.resolve<AlreadyForgedHandler>(AlreadyForgedHandler);

		const resetLastDownloadedBlockSpy = spy(context.blockchain, "resetLastDownloadedBlock");

		const block = {};
		const result = await alreadyForgedHandler.execute(block as Interfaces.IBlock);

		assert.equal(result, BlockProcessorResult.DiscardedButCanBeBroadcasted);
		resetLastDownloadedBlockSpy.calledOnce();
	});
});

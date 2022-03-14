import { Container } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { BlockProcessorResult } from "../contracts";
import { AlreadyForgedHandler } from "./already-forged-handler";

describe<{
	container: Container;
	blockchain: any;
	application: any;
}>("AlreadyForgedHandler", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.blockchain = {
			resetLastDownloadedBlock: () => {},
		};
		context.application = {
			get: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
	});

	it("should call blockchain.resetLastDownloadedBlock and return DiscardedButCanBeBroadcasted", async (context) => {
		const alreadyForgedHandler = context.container.resolve<AlreadyForgedHandler>(AlreadyForgedHandler);

		const resetLastDownloadedBlockSpy = spy(context.blockchain, "resetLastDownloadedBlock");

		const block = {};
		const result = await alreadyForgedHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.DiscardedButCanBeBroadcasted);
		resetLastDownloadedBlockSpy.calledOnce();
	});
});

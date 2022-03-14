import { Container } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { BlockProcessorResult } from "../contracts";
import { IncompatibleTransactionsHandler } from "./incompatible-transactions-handler";

describe<{
	container: Container;
	blockchain: any;
	application: any;
}>("IncompatibleTransactionsHandler", ({ assert, beforeEach, it, spy }) => {
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
		const incompatibleTransactionsHandler = context.container.resolve<IncompatibleTransactionsHandler>(
			IncompatibleTransactionsHandler,
		);

		const resetLastDownloadedBlockSpy = spy(context.blockchain, "resetLastDownloadedBlock");

		const block = {};
		const result = await incompatibleTransactionsHandler.execute(block as Contracts.Crypto.IBlock);

		assert.equal(result, BlockProcessorResult.Rejected);
		resetLastDownloadedBlockSpy.calledOnce();
	});
});

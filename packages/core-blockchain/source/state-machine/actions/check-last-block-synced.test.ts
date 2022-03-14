import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { CheckLastBlockSynced } from "./check-last-block-synced";

describe<{
	container: Container;
	blockchain: any;
	application: any;
}>("CheckLastBlockSynced", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.blockchain = {
			dispatch: () => {},
			isSynced: () => {},
		};
		context.application = {
			resolve: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
	});

	it("should dispatch SYNCED if blockchain is synced", async (context) => {
		const checkLastBlockSynced = context.container.resolve<CheckLastBlockSynced>(CheckLastBlockSynced);

		stub(context.blockchain, "isSynced").returnValue(true);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		await checkLastBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("SYNCED");
	});

	it("should dispatch NOTSYNCED if blockchain is not synced", async (context) => {
		const checkLastBlockSynced = context.container.resolve<CheckLastBlockSynced>(CheckLastBlockSynced);

		stub(context.blockchain, "isSynced").returnValue(false);
		const dispatchSpy = spy(context.blockchain, "dispatch");

		await checkLastBlockSynced.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("NOTSYNCED");
	});
});

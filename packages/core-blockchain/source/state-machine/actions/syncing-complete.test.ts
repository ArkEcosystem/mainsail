import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { SyncingComplete } from "./syncing-complete";

describe<{
	container: Container.Container;
	logger: any;
	blockchain: any;
	application: any;
}>("Syncing Complete", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.logger = {
			warning: () => undefined,
			debug: () => undefined,
			info: () => undefined,
		};
		context.blockchain = {
			dispatch: () => undefined,
		};
		context.application = {
			get: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
	});

	it("should dispatch SYNCFINISHED", (context) => {
		const syncingComplete = context.container.resolve<SyncingComplete>(SyncingComplete);

		const dispatchSpy = spy(context.blockchain, "dispatch");

		syncingComplete.handle();

		dispatchSpy.calledOnce();
		dispatchSpy.calledWith("SYNCFINISHED");
	});
});

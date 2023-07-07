import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/contracts";

import { describe } from "../../../../test-framework";
import { DownloadFinished } from "./download-finished";

describe<{
	container: Container;
	blockchain: any;
	logger: any;
}>("DownloadFinished", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.blockchain = {
			dispatch: () => {},
			getQueue: () => context.queue,
		};
		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warn: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);
	});

	describe("handle", () => {
		it("should dispatch PROCESSFINISHED", async (context) => {
			const downloadFinished = context.container.resolve<DownloadFinished>(DownloadFinished);

			const dispatchSpy = spy(context.blockchain, "dispatch");

			await downloadFinished.handle();

			dispatchSpy.calledOnce();
			dispatchSpy.calledWith("PROCESSFINISHED");
		});
	});
});

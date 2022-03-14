import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../../../core-test-framework";
import { DownloadFinished } from "./download-finished";

describe<{
	container: Container;
	blockchain: any;
	stateStore: any;
	application: any;
	queue: any;
	logger: any;
}>("DownloadFinished", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.queue = {
			isRunning: () => true,
			size: () => {},
		};
		context.blockchain = {
			dispatch: () => {},
			getQueue: () => context.queue,
		};
		context.stateStore = {
			getNetworkStart: () => false,
			setNetworkStart: () => {},
		};
		context.application = {
			resolve: () => {},
		};
		context.logger = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warn: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logger);
	});

	describe("handle", () => {
		it("should dispatch SYNCFINISHED when stateStore.networkStart", async (context) => {
			const downloadFinished = context.container.resolve<DownloadFinished>(DownloadFinished);

			stub(context.stateStore, "getNetworkStart").returnValue(true);
			const setNetworkStartSpy = spy(context.stateStore, "setNetworkStart");
			const dispatchSpy = spy(context.blockchain, "dispatch");

			await downloadFinished.handle();

			dispatchSpy.calledOnce();
			dispatchSpy.calledWith("SYNCFINISHED");
			setNetworkStartSpy.calledWith(false);
		});

		it("should dispatch PROCESSFINISHED when !blockchain.getQueue.isRunning()", async (context) => {
			const downloadFinished = context.container.resolve<DownloadFinished>(DownloadFinished);

			stub(context.queue, "isRunning").returnValue(false);
			const dispatchSpy = spy(context.blockchain, "dispatch");

			await downloadFinished.handle();

			dispatchSpy.calledOnce();
			dispatchSpy.calledWith("PROCESSFINISHED");
		});

		it("should dispatch nothing when blockchain.getQueue.isRunning()", async (context) => {
			const downloadFinished = context.container.resolve<DownloadFinished>(DownloadFinished);

			stub(context.queue, "isRunning").returnValue(true);
			const dispatchSpy = spy(context.blockchain, "dispatch");

			await downloadFinished.handle();

			dispatchSpy.neverCalled();
		});
	});
});

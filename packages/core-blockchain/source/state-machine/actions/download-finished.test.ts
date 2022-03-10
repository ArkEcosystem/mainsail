import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { DownloadFinished } from "./download-finished";

describe<{
	container: Container.Container;
	blockchain: any;
	stateStore: any;
	application: any;
	queue: any;
	logger: any;
}>("DownloadFinished", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.queue = {
			size: () => undefined,
			isRunning: () => true,
		};
		context.blockchain = {
			dispatch: () => undefined,
			getQueue: () => context.queue,
		};
		context.stateStore = {
			getNetworkStart: () => false,
			setNetworkStart: () => undefined,
		};
		context.application = {
			resolve: () => undefined,
		};
		context.logger = {
			warn: () => undefined,
			debug: () => undefined,
			info: () => undefined,
			error: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
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

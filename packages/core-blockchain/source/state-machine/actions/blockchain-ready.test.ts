import { Container } from "@arkecosystem/core-container";
import { Identifiers } from "@arkecosystem/core-contracts";
import { Enums } from "@arkecosystem/core-kernel";

import { describe } from "../../../../core-test-framework";
import { BlockchainReady } from "./blockchain-ready";

describe<{
	container: Container;
	logService: any;
	stateStore: any;
	eventDispatcher: any;
	application: any;
}>("BlockchainReady", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.logService = {
			debug: () => {},
			error: () => {},
			info: () => {},
			warning: () => {},
		};
		context.stateStore = {
			isStarted: () => false,
			setStarted: () => {},
		};
		context.eventDispatcher = {
			dispatch: () => {},
		};
		context.application = {
			resolve: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Identifiers.LogService).toConstantValue(context.logService);
		context.container.bind(Identifiers.StateStore).toConstantValue(context.stateStore);
		context.container.bind(Identifiers.EventDispatcherService).toConstantValue(context.eventDispatcher);
	});

	it("should set stateStore.started = true and dispatch started event", async (context) => {
		const blockchainReady = context.container.resolve<BlockchainReady>(BlockchainReady);

		stub(context.stateStore, "isStarted").returnValue(false);
		const setStartedSpy = spy(context.stateStore, "setStarted");
		const dispatchSpy = spy(context.eventDispatcher, "dispatch");
		await blockchainReady.handle();

		setStartedSpy.calledWith(true);
		dispatchSpy.calledOnce();
		dispatchSpy.calledWith(Enums.StateEvent.Started, true);
	});

	it("should do nothing if stateStore.started is true", async (context) => {
		const blockchainReady = context.container.resolve<BlockchainReady>(BlockchainReady);

		const dispatchSpy = spy(context.eventDispatcher, "dispatch");

		stub(context.stateStore, "isStarted").returnValue(true);
		await blockchainReady.handle();

		dispatchSpy.neverCalled();
	});
});

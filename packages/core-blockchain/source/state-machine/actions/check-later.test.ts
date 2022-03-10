import { Container } from "@arkecosystem/core-kernel";
import { describe } from "../../../../core-test-framework";

import { CheckLater } from "./check-later";

describe<{
	container: Container.Container;
	blockchain: any;
	stateStore: any;
	application: any;
}>("CheckLater", ({ beforeEach, it, spy, stub }) => {
	beforeEach((context) => {
		context.blockchain = {
			isStopped: () => false,
			setWakeUp: () => undefined,
		};
		context.stateStore = {
			isWakeUpTimeoutSet: () => false,
		};
		context.application = {
			resolve: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.Application).toConstantValue(context.application);
		context.container.bind(Container.Identifiers.BlockchainService).toConstantValue(context.blockchain);
		context.container.bind(Container.Identifiers.StateStore).toConstantValue(context.stateStore);
	});

	it("should call blockchain.setWakeUp() when !blockchain.isStopped && !stateStore.wakeUpTimeout", (context) => {
		const checkLater = context.container.resolve<CheckLater>(CheckLater);

		const setWakeUpSpy = spy(context.blockchain, "setWakeUp");
		checkLater.handle();

		setWakeUpSpy.calledOnce();
	});

	it("should do nothing otherwise", (context) => {
		const checkLater = context.container.resolve<CheckLater>(CheckLater);

		const setWakeUpSpy = spy(context.blockchain, "setWakeUp");

		stub(context.blockchain, "isStopped").returnValue(true);
		checkLater.handle();

		setWakeUpSpy.neverCalled();
	});
});

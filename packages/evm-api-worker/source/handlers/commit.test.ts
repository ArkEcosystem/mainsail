import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { CommitHandler } from "./commit";

describe<{
	app: Application;
	handler: CommitHandler;
	stateStore: any;
}>("CommitHandler", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.stateStore = { setBlockNumber: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);

		context.handler = context.app.resolve(CommitHandler);
	});

	it("sets the block number on the state store", async ({ handler, stateStore }) => {
		const setBlockNumber = spy(stateStore, "setBlockNumber");

		await handler.handle(123);

		setBlockNumber.calledOnce();
		setBlockNumber.calledWith(123);
	});
});

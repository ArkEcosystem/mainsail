import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { SetPeerCountHandler } from "./set-peer-count";

describe<{
	app: Application;
	handler: SetPeerCountHandler;
	state: any;
}>("SetPeerCountHandler", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.state = { peerCount: 0 };

		context.app = new Application();
		context.app.bind(Identifiers.Evm.State).toConstantValue(context.state);

		context.handler = context.app.resolve(SetPeerCountHandler);
	});

	it("stores the peer count on the evm state", async ({ handler, state }) => {
		await handler.handle(7);

		assert.equal(state.peerCount, 7);
	});
});

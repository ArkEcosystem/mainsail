import { Application } from "@mainsail/kernel";
import type { Contracts } from "@mainsail/contracts";

import { describe } from "@mainsail/test-runner";
import { State } from "./state";

describe<{
	state: Contracts.Evm.State;
}>("ServiceProvider", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		const app = new Application();
		context.state = app.resolve(State);
	});

	it("#peerCount - should have default value 0", async ({ state }) => {
		assert.equal(state.peerCount, 0);
	});

	it("#peerCount - should be set and read", async ({ state }) => {
		state.peerCount = 5;
		assert.equal(state.peerCount, 5);
	});
});

import { Identifiers } from "@mainsail/constants";

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

	it("#peersCount - should have default value 0", async ({ state, app }) => {
		assert.equal(state.peersCount, 0);
	});

	it("#peersCount - should be set and read", async ({ state }) => {
		state.peersCount = 5;
		assert.equal(state.peersCount, 5);
	});
});

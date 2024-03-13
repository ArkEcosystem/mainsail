import { describe, Sandbox } from "../../test-framework/source";
import { State } from "./state";

describe<{
	sandbox: Sandbox;
	state: State;
}>("State", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.sandbox = new Sandbox();

		context.state = context.sandbox.app.resolve(State);
	});

	it("#isBootstrap - should return true by default", ({ state }) => {
		assert.true(state.isBootstrap());
	});

	it("#setBootstrap - should set bootstrap", ({ state }) => {
		state.setBootstrap(false);
		assert.false(state.isBootstrap());
	});
});

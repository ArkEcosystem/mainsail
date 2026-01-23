import { Application } from "@mainsail/kernel";
import { Container } from "@mainsail/container";
import { describe } from "@mainsail/test-runner";
import { State } from "./state";

describe<{
	app: Application;
	state: State;
}>("State", ({ it, beforeEach, assert }) => {
	beforeEach(async (context) => {
		context.app = new Application(new Container());

		context.state = context.app.resolve(State);
	});

	it("#isBootstrap - should return true by default", ({ state }) => {
		assert.true(state.isBootstrap());
	});

	it("#setBootstrap - should set bootstrap", ({ state }) => {
		state.setBootstrap(false);
		assert.false(state.isBootstrap());
	});
});

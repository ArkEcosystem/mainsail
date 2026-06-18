import { describe } from "@mainsail/test-runner";

import { Action } from "./action";

class StubAction extends Action {
	public async execute<T>(): Promise<T> {
		return undefined as T;
	}
}

describe<{
	action: StubAction;
}>("Action", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.action = new StubAction();
	});

	it("should register and expose before/after/error hooks", ({ action }) => {
		const before = () => ({});
		const after = () => ({});
		const error = () => ({});

		action.before(before);
		action.after(after);
		action.error(error);

		assert.true(action.hooks("before").has(before));
		assert.true(action.hooks("after").has(after));
		assert.true(action.hooks("error").has(error));
	});

	it("should keep hook registrations chainable", ({ action }) => {
		assert.equal(
			action
				.before(() => ({}))
				.after(() => ({}))
				.error(() => ({})),
			action,
		);
	});

	it("should not duplicate the same hook function", ({ action }) => {
		const hook = () => ({});

		action.before(hook);
		action.before(hook);

		assert.equal(action.hooks("before").size, 1);
	});
});

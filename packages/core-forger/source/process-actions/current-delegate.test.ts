import { Container } from "@arkecosystem/core-kernel";
import { describe, Sandbox } from "../../../core-test-framework/source";
import { CurrentDelegateProcessAction } from "./current-delegate";

const mockForgerService = {
	getRound: () => ({
		currentForger: {
			delegate: {
				username: "dummy_username",
				rank: 10,
			},
		},
	}),
};

describe<{
	sandbox: Sandbox;
	action: CurrentDelegateProcessAction;
}>("CurrentDelegateRemoteAction", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Container.Identifiers.ForgerService).toConstantValue(mockForgerService);

		context.action = context.sandbox.app.resolve(CurrentDelegateProcessAction);
	});

	it("should return delegate username and rank", async (context) => {
		await assert.resolves(() => context.action.handler());
		const result = await context.action.handler();

		assert.equal(result, {
			username: "dummy_username",
			rank: 10,
		});
	});
});

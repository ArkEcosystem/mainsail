import { Container } from "@arkecosystem/core-kernel";
import { describe, Sandbox } from "../../../core-test-framework/source";
import { NextSlotProcessAction } from "./next-slot";

const mockForgerService = {
	getRemainingSlotTime: () => 1000,
};

describe<{
	sandbox: Sandbox;
	action: NextSlotProcessAction;
}>("NextSlotProcessAction", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Container.Identifiers.ForgerService).toConstantValue(mockForgerService);

		context.action = context.sandbox.app.resolve(NextSlotProcessAction);
	});
	it("should return remaining time", async (context) => {
		await assert.resolves(() => context.action.handler());
		const result = await context.action.handler();

		assert.equal(result, {
			remainingTime: 1000,
		});
	});
});

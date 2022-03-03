import { Container } from "@arkecosystem/core-kernel";
import { describe, Sandbox } from "../../../core-test-framework/source";
import { LastForgedBlockRemoteAction } from "./last-forged-block";

const mockBlock = {
	data: {
		id: "123",
	},
};

const mockForgerService = {
	getLastForgedBlock: () => mockBlock,
};

describe<{
	sandbox: Sandbox;
	action: LastForgedBlockRemoteAction;
}>("LastForgedBlockProcessAction", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Container.Identifiers.ForgerService).toConstantValue(mockForgerService);
		context.action = context.sandbox.app.resolve(LastForgedBlockRemoteAction);
	});

	it("should return last forged block", async (context) => {
		await assert.resolves(() => context.action.handler());
		const result = await context.action.handler();

		assert.equal(result, mockBlock.data);
	});
});

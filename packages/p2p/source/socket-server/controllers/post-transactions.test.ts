import { Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "../../../../test-framework";

import { PostTransactionsController } from "./post-transactions";

describe<{
	sandbox: Sandbox;
	controller: PostTransactionsController;
}>("PostTransactionsController", ({ it, assert, beforeEach, stub }) => {
	const processor = { process: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.TransactionPool.Processor).toConstantValue(processor);

		context.controller = context.sandbox.app.resolve(PostTransactionsController);
	});

	it("should use processor it to process the transactions", async ({ controller }) => {
		stub(processor, "process").resolvedValue({ accept: ["123"] });

		assert.equal(await controller.handle({ payload: { transactions: Buffer.from("") } }, {}), { accept: ["123"] });
	});
});

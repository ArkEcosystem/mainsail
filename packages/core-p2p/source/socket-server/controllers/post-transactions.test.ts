import { Identifiers } from "@arkecosystem/core-contracts";
import { describe, Sandbox } from "../../../../core-test-framework";

import { PostTransactionsController } from "./post-transactions";

describe<{
	sandbox: Sandbox;
	controller: PostTransactionsController;
}>("PostTransactionsController", ({ it, assert, beforeEach, stub }) => {
	const processor = { process: () => {} };

	beforeEach((context) => {
		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.TransactionPoolProcessor).toConstantValue(processor);

		context.controller = context.sandbox.app.resolve(PostTransactionsController);
	});

	it("should use processor it to process the transactions", async ({ controller }) => {
		stub(processor, "process").resolvedValue({ accept: ["123"] });

		assert.equal(await controller.handle({ payload: { transactions: Buffer.from("") } }, {}), ["123"]);
	});
});

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { GetTransactionsHandler } from "./get-transactions";

describe<{
	app: Application;
	handler: GetTransactionsHandler;
	selector: any;
}>("GetTransactionsHandler", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.selector = { getBatch: async () => ({ remaining: 0, transactions: [] }) };

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Selector).toConstantValue(context.selector);

		context.handler = context.app.resolve(GetTransactionsHandler);
	});

	it("delegates to the selector and returns its batch", async ({ handler, selector }) => {
		const batch = { remaining: 2, transactions: [] };
		selector.getBatch = async () => batch;
		const getBatch = spy(selector, "getBatch");

		const options = { blockRound: "0", maxBytes: 1024, maxSize: 100 };
		const result = await handler.handle(options);

		getBatch.calledOnce();
		getBatch.calledWith(options);
		assert.equal(result, batch);
	});
});

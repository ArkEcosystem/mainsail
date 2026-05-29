import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { GetTransactionsHandler } from "./get-transactions";

describe<{
	app: Application;
	selector: any;
}>("GetTransactionsHandler", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.selector = { getBatch: async () => ({ transactions: [] }) };

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Selector).toConstantValue(context.selector);
	});

	it("delegates to the selector and returns its batch", async (context) => {
		const batch = { transactions: [Buffer.from("tx")] };
		context.selector.getBatch = async () => batch;
		const getBatch = spy(context.selector, "getBatch");

		const options = { limit: 5 };
		const result = await context.app.resolve(GetTransactionsHandler).handle(options as any);

		getBatch.calledOnce();
		getBatch.calledWith(options);
		assert.equal(result, batch);
	});
});

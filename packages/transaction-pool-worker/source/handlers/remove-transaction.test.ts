import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { RemoveTransactionHandler } from "./remove-transaction";

describe<{
	app: Application;
	mempool: any;
	storage: any;
}>("RemoveTransactionHandler", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.mempool = { removeTransaction: async () => {} };
		context.storage = { removeTransaction: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Mempool).toConstantValue(context.mempool);
		context.app.bind(Identifiers.TransactionPool.Storage).toConstantValue(context.storage);
	});

	it("removes the transaction from the mempool and the storage", async (context) => {
		const fromMempool = spy(context.mempool, "removeTransaction");
		const fromStorage = spy(context.storage, "removeTransaction");

		await context.app.resolve(RemoveTransactionHandler).handle("address-1", "hash-1");

		fromMempool.calledOnce();
		fromMempool.calledWith("address-1", "hash-1");
		fromStorage.calledOnce();
		fromStorage.calledWith("hash-1");
	});
});

import { Events, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { RemoveTransactionHandler } from "./remove-transaction";

describe<{
	app: Application;
	handler: RemoveTransactionHandler;
	events: any;
	mempool: any;
	storage: any;
}>("RemoveTransactionHandler", ({ beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.events = { dispatch: async () => {} };
		context.mempool = { removeTransaction: async () => [] };
		context.storage = { removeTransaction: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Services.EventDispatcher.Service).toConstantValue(context.events);
		context.app.bind(Identifiers.TransactionPool.Mempool).toConstantValue(context.mempool);
		context.app.bind(Identifiers.TransactionPool.Storage).toConstantValue(context.storage);

		context.handler = context.app.resolve(RemoveTransactionHandler);
	});

	it("removes the transaction from the mempool and the storage", async ({ handler, mempool, storage }) => {
		const fromMempool = spy(mempool, "removeTransaction");
		const fromStorage = spy(storage, "removeTransaction");

		await handler.handle("address-1", "hash-1");

		fromMempool.calledOnce();
		fromMempool.calledWith("address-1", "hash-1");
		fromStorage.calledOnce();
		fromStorage.calledWith("hash-1");
	});

	it("removes the sender's higher-nonce transactions from storage and dispatches removal events", async ({
		handler,
		events,
		mempool,
		storage,
	}) => {
		const removed = [
			{ hash: "hash-1", toData: () => ({ hash: "hash-1" }) },
			{ hash: "hash-2", toData: () => ({ hash: "hash-2" }) },
		];
		mempool.removeTransaction = async () => removed;

		const fromStorage = spy(storage, "removeTransaction");
		const dispatch = spy(events, "dispatch");

		await handler.handle("address-1", "hash-1");

		fromStorage.calledTimes(2);
		fromStorage.calledWith("hash-1");
		fromStorage.calledWith("hash-2");
		dispatch.calledTimes(2);
		dispatch.calledWith(Events.TransactionEvent.RemovedFromPool, removed[0].toData());
		dispatch.calledWith(Events.TransactionEvent.RemovedFromPool, removed[1].toData());
	});
});

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { CommitHandler } from "./commit";

describe<{
	app: Application;
	handler: CommitHandler;
	stateStore: any;
	configuration: any;
	transactionPoolService: any;
	selector: any;
}>("CommitHandler", ({ assert, beforeEach, it, spy }) => {
	beforeEach((context) => {
		context.stateStore = { setBlockNumber: () => {} };
		context.configuration = { isNewMilestone: () => false };
		context.transactionPoolService = { commit: async () => {}, reAddTransactions: async () => {} };
		context.selector = { clear: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.TransactionPool.Service).toConstantValue(context.transactionPoolService);
		context.app.bind(Identifiers.TransactionPool.Selector).toConstantValue(context.selector);

		context.handler = context.app.resolve(CommitHandler);
	});

	it("sets the block number and clears the selector", async ({ handler, stateStore, selector }) => {
		const setBlockNumber = spy(stateStore, "setBlockNumber");
		const clear = spy(selector, "clear");

		await handler.handle(10, ["address-1"], 1000, false);

		setBlockNumber.calledOnce();
		setBlockNumber.calledWith(10);
		clear.calledOnce();
	});

	it("commits the senders, gas and syncing flag when not a new milestone", async ({
		handler,
		transactionPoolService,
	}) => {
		const commit = spy(transactionPoolService, "commit");
		const reAdd = spy(transactionPoolService, "reAddTransactions");

		await handler.handle(10, ["address-1", "address-2"], 5000, true);

		commit.calledOnce();
		commit.calledWith(["address-1", "address-2"], 5000, true);
		reAdd.neverCalled();
	});

	it("re-adds transactions instead of committing on a new milestone", async ({
		handler,
		configuration,
		transactionPoolService,
	}) => {
		configuration.isNewMilestone = () => true;
		const commit = spy(transactionPoolService, "commit");
		const reAdd = spy(transactionPoolService, "reAddTransactions");

		await handler.handle(10, ["address-1"], 1000, false);

		reAdd.calledOnce();
		commit.neverCalled();
	});

	it("wraps a thrown error with a 'Failed to commit block' message", async ({ handler, transactionPoolService }) => {
		transactionPoolService.commit = async () => {
			throw new Error("boom");
		};

		await assert.rejects(() => handler.handle(10, ["address-1"], 1000, false), "Failed to commit block: boom");
	});

	it("normalizes a non-Error throw into the wrapped message", async ({ handler, selector }) => {
		selector.clear = () => {
			throw "string failure";
		};

		await assert.rejects(
			() => handler.handle(10, ["address-1"], 1000, false),
			"Failed to commit block: string failure",
		);
	});
});

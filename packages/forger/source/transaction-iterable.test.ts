import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { TransactionIterable } from "./transaction-iterable";

describe<{
	app: Application;
	iterable: TransactionIterable;
	transactionFactory: any;
	txPoolWorker: any;
}>("TransactionIterable", ({ beforeEach, it, assert, spy, stub }) => {
	beforeEach((context) => {
		context.txPoolWorker = {
			getTransactions: async () => ({ remaining: 0, transactions: [] }),
		};
		context.transactionFactory = {
			fromPoolData: async (data: any) => ({ ...data, fromPool: true }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Worker).toConstantValue(context.txPoolWorker);
		context.app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue(context.transactionFactory);

		context.iterable = context.app.resolve(TransactionIterable).initialize({ blockNumber: 2n, round: 1n });
	});

	const collect = async (iterable: TransactionIterable) => {
		const transactions: any[] = [];
		for await (const transaction of iterable) {
			transactions.push(transaction);
		}

		return transactions;
	};

	it("#initialize - should return the iterable instance", ({ iterable }) => {
		assert.is(iterable.initialize({ blockNumber: 2n, round: 1n }), iterable);
	});

	it("should complete without yielding when the pool is empty", async ({ iterable, txPoolWorker }) => {
		const getTransactions = spy(txPoolWorker, "getTransactions");

		assert.empty(await collect(iterable));

		getTransactions.calledOnce();
		getTransactions.calledWith({ blockRound: "2-1", maxBytes: 10_000_000, maxSize: 100 });
	});

	it("should yield deserialized transactions until the pool returns an empty batch", async ({
		iterable,
		transactionFactory,
		txPoolWorker,
	}) => {
		const getTransactions = stub(txPoolWorker, "getTransactions").resolvedValueSequence([
			{ remaining: 1, transactions: [{ hash: "1" }, { hash: "2" }] },
			{ remaining: 0, transactions: [{ hash: "3" }] },
			{ remaining: 0, transactions: [] },
		]);
		const fromPoolData = spy(transactionFactory, "fromPoolData");

		const transactions = await collect(iterable);

		assert.equal(
			transactions.map(({ hash }) => hash),
			["1", "2", "3"],
		);
		assert.true(transactions.every(({ fromPool }) => fromPool));
		getTransactions.calledTimes(3);
		fromPoolData.calledTimes(3);
		fromPoolData.calledNthWith(0, { hash: "1" });
	});

	it("should stop fetching and deserializing when the consumer stops early", async ({
		iterable,
		transactionFactory,
		txPoolWorker,
	}) => {
		const getTransactions = stub(txPoolWorker, "getTransactions").resolvedValueSequence([
			{ remaining: 1, transactions: [{ hash: "1" }, { hash: "2" }] },
			{ remaining: 0, transactions: [] },
		]);
		const fromPoolData = spy(transactionFactory, "fromPoolData");

		for await (const transaction of iterable) {
			assert.equal(transaction.hash, "1");
			break;
		}

		getTransactions.calledOnce();
		fromPoolData.calledOnce();
	});

	it("should abort the iteration when a transaction cannot be deserialized", async ({
		iterable,
		transactionFactory,
		txPoolWorker,
	}) => {
		stub(txPoolWorker, "getTransactions").resolvedValue({
			remaining: 0,
			transactions: [{ hash: "1" }, { hash: "2" }],
		});
		const fromPoolData = stub(transactionFactory, "fromPoolData").resolvedValue({ fromPool: true, hash: "1" });
		fromPoolData.rejectedValueNth(1, new Error("malformed"));

		await assert.rejects(() => collect(iterable), "malformed");

		fromPoolData.calledTimes(2);
	});
});

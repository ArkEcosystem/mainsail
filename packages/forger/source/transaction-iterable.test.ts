import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { performance } from "perf_hooks";
import { TransactionIterable } from "./transaction-iterable";

describe<{
	app: Application;
	iterable: TransactionIterable;
	logger: any;
	transactionFactory: any;
	txPoolWorker: any;
}>("TransactionIterable", ({ beforeEach, it, assert, clock, spy, stub }) => {
	beforeEach((context) => {
		context.txPoolWorker = {
			getTransactions: async () => ({ remaining: 0, transactions: [] }),
		};
		context.transactionFactory = {
			fromPoolData: async (data: any) => ({ ...data, fromPool: true }),
		};
		context.logger = { warn: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Worker).toConstantValue(context.txPoolWorker);
		context.app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue(context.transactionFactory);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.iterable = context.app
			.resolve(TransactionIterable)
			.initialize({ blockNumber: 2n, round: 1n }, performance.now() + 1000);
	});

	const collect = async (iterable: TransactionIterable) => {
		const transactions: any[] = [];
		for await (const transaction of iterable) {
			transactions.push(transaction);
		}

		return transactions;
	};

	it("#initialize - should return the iterable instance", ({ iterable }) => {
		assert.is(iterable.initialize({ blockNumber: 2n, round: 1n }, performance.now() + 1000), iterable);
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

	it("should stop waiting for the pool at the deadline and warn", async ({ app, txPoolWorker, logger }) => {
		const warn = spy(logger, "warn");
		const fake = clock({ toFake: ["setTimeout", "clearTimeout"] });
		txPoolWorker.getTransactions = async () => new Promise(() => {});
		const iterable = app
			.resolve(TransactionIterable)
			.initialize({ blockNumber: 2n, round: 1n }, performance.now() + 3000);

		let transactions: unknown[] | undefined;
		void collect(iterable).then((result) => (transactions = result));
		await fake.tickAsync(2000);

		assert.undefined(transactions);

		await fake.tickAsync(1000);

		assert.equal(transactions, []);
		warn.calledWith("The transaction pool did not hand over transactions within the block time budget");
	});

	it("should not ask the pool once the deadline has passed", async ({ app, txPoolWorker }) => {
		const getTransactions = spy(txPoolWorker, "getTransactions");
		const iterable = app
			.resolve(TransactionIterable)
			.initialize({ blockNumber: 2n, round: 1n }, performance.now() - 1);

		assert.empty(await collect(iterable));
		getTransactions.neverCalled();
	});
});

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Selector } from "./selector";

const makeTransaction = (index: number, size = 10): any => ({
	serialized: Buffer.alloc(size),
	toData: () => ({ hash: `tx-${index}` }),
});

const makeTransactions = (count: number, size?: number): any[] =>
	Array.from({ length: count }, (_, index) => makeTransaction(index, size));

describe<{
	app: Application;
	poolQuery: any;
	selector: Selector;
}>("Selector", ({ it, beforeEach, assert, stub, spy }) => {
	beforeEach((context) => {
		context.poolQuery = {
			getFromHighestPriority: () => ({ all: async () => [] }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Query).toConstantValue(context.poolQuery);

		context.selector = context.app.resolve(Selector);
	});

	it("getBatch - should return all transactions when below maxSize and maxBytes", async ({ selector, poolQuery }) => {
		stub(poolQuery, "getFromHighestPriority").returnValue({ all: async () => makeTransactions(5) });

		const batch = await selector.getBatch({ blockRound: "1-0", maxBytes: 10_000, maxSize: 100 });

		assert.equal(
			batch.transactions.map((transaction) => transaction.hash),
			["tx-0", "tx-1", "tx-2", "tx-3", "tx-4"],
		);
		assert.equal(batch.remaining, 0);
	});

	it("getBatch - should return an empty batch for an empty pool", async ({ selector }) => {
		const batch = await selector.getBatch({ blockRound: "1-0", maxBytes: 10_000, maxSize: 100 });

		assert.equal(batch, { remaining: 0, transactions: [] });
	});

	it("getBatch - should return an empty batch when the first transaction exceeds maxBytes", async ({
		selector,
		poolQuery,
	}) => {
		stub(poolQuery, "getFromHighestPriority").returnValue({ all: async () => makeTransactions(3, 100) });

		// The first transaction costs 4 + 100 bytes.
		const batch = await selector.getBatch({ blockRound: "1-0", maxBytes: 103, maxSize: 100 });

		assert.equal(batch, { remaining: 3, transactions: [] });
	});

	it("getBatch - should return each transaction exactly once when the pool is an exact multiple of maxSize", async ({
		selector,
		poolQuery,
	}) => {
		stub(poolQuery, "getFromHighestPriority").returnValue({ all: async () => makeTransactions(200) });

		const options = { blockRound: "1-0", maxBytes: 10_000_000, maxSize: 100 };

		const batch1 = await selector.getBatch(options);
		const batch2 = await selector.getBatch(options);
		const batch3 = await selector.getBatch(options);

		assert.equal(batch1.transactions.length, 100);
		assert.equal(batch1.remaining, 100);
		assert.equal(batch2.transactions.length, 100);
		assert.equal(batch2.remaining, 0);
		assert.equal(batch3.transactions.length, 0);
		assert.equal(batch3.remaining, 0);

		const hashes = [...batch1.transactions, ...batch2.transactions].map((transaction) => transaction.hash);
		assert.equal(hashes.length, new Set(hashes).size);
		assert.equal(hashes[99], "tx-99");
		assert.equal(hashes[100], "tx-100");
	});

	it("getBatch - should not duplicate the boundary transaction across batches", async ({ selector, poolQuery }) => {
		stub(poolQuery, "getFromHighestPriority").returnValue({ all: async () => makeTransactions(250) });

		const options = { blockRound: "1-0", maxBytes: 10_000_000, maxSize: 100 };

		const hashes: string[] = [];
		let batch = await selector.getBatch(options);
		while (batch.transactions.length > 0) {
			hashes.push(...batch.transactions.map((transaction) => transaction.hash));
			batch = await selector.getBatch(options);
		}

		assert.equal(hashes.length, 250);
		assert.equal(hashes.length, new Set(hashes).size);
		assert.equal(
			hashes,
			makeTransactions(250).map((transaction) => transaction.toData().hash),
		);
	});

	it("getBatch - should resume at the first transaction that did not fit maxBytes", async ({
		selector,
		poolQuery,
	}) => {
		stub(poolQuery, "getFromHighestPriority").returnValue({ all: async () => makeTransactions(4, 100) });

		// Each transaction costs 4 + 100 bytes; 250 bytes fit exactly 2 of them.
		const options = { blockRound: "1-0", maxBytes: 250, maxSize: 100 };

		const batch1 = await selector.getBatch(options);
		const batch2 = await selector.getBatch(options);

		assert.equal(
			batch1.transactions.map((transaction) => transaction.hash),
			["tx-0", "tx-1"],
		);
		assert.equal(batch1.remaining, 2);
		assert.equal(
			batch2.transactions.map((transaction) => transaction.hash),
			["tx-2", "tx-3"],
		);
		assert.equal(batch2.remaining, 0);
	});

	it("getBatch - should not re-query the pool for the same blockRound", async ({ selector, poolQuery }) => {
		const getFromHighestPriority = stub(poolQuery, "getFromHighestPriority").returnValue({
			all: async () => makeTransactions(5),
		});

		await selector.getBatch({ blockRound: "1-0", maxBytes: 10_000, maxSize: 2 });
		await selector.getBatch({ blockRound: "1-0", maxBytes: 10_000, maxSize: 2 });

		getFromHighestPriority.calledOnce();
	});

	it("getBatch - should re-query the pool and restart on a new blockRound", async ({ selector, poolQuery }) => {
		const getFromHighestPriority = stub(poolQuery, "getFromHighestPriority").returnValue({
			all: async () => makeTransactions(5),
		});

		const batch1 = await selector.getBatch({ blockRound: "1-0", maxBytes: 10_000, maxSize: 2 });
		const batch2 = await selector.getBatch({ blockRound: "1-1", maxBytes: 10_000, maxSize: 2 });

		getFromHighestPriority.calledTimes(2);
		assert.equal(
			batch1.transactions.map((transaction) => transaction.hash),
			["tx-0", "tx-1"],
		);
		assert.equal(
			batch2.transactions.map((transaction) => transaction.hash),
			["tx-0", "tx-1"],
		);
	});

	it("clear - should restart from the beginning", async ({ selector, poolQuery }) => {
		stub(poolQuery, "getFromHighestPriority").returnValue({ all: async () => makeTransactions(5) });

		const batch1 = await selector.getBatch({ blockRound: "1-0", maxBytes: 10_000, maxSize: 2 });
		selector.clear();
		const batch2 = await selector.getBatch({ blockRound: "1-0", maxBytes: 10_000, maxSize: 2 });

		assert.equal(
			batch1.transactions.map((transaction) => transaction.hash),
			["tx-0", "tx-1"],
		);
		assert.equal(
			batch2.transactions.map((transaction) => transaction.hash),
			["tx-0", "tx-1"],
		);
	});
});

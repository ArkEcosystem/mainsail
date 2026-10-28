import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Query, QueryIterable } from "./query";

const alice = "0x75545540230d5c3BEf023202d23CB74cFA723376";
const bob = "0xbbe7B35057F3431E001d2b96817e3061B59849c9";

const makeTransaction = (from: string, nonce: bigint, gasPrice: number): Contracts.Crypto.Transaction =>
	({ from, gasPrice, hash: `${from}-${nonce}`, nonce }) as unknown as Contracts.Crypto.Transaction;

const makeRandom = (seed: number) => (max: number) => (seed = (seed * 48_271) % 2_147_483_647) % max;

describe<{
	app: Application;
	mempool: any;
	query: Query;
	aliceTransaction1: Contracts.Crypto.Transaction;
	aliceTransaction2: Contracts.Crypto.Transaction;
	bobTransaction1: Contracts.Crypto.Transaction;
	bobTransaction2: Contracts.Crypto.Transaction;
}>("Query", ({ it, assert, beforeEach, spy, stub }) => {
	beforeEach((context) => {
		context.aliceTransaction1 = makeTransaction(alice, 1n, 100 * 1e9);
		context.aliceTransaction2 = makeTransaction(alice, 2n, 200 * 1e9);
		context.bobTransaction1 = makeTransaction(bob, 1n, 300 * 1e9);
		context.bobTransaction2 = makeTransaction(bob, 2n, 400 * 1e9);

		context.mempool = {
			getSenderMempool: () => {},
			getSenderMempools: () => [],
			hasSenderMempool: () => false,
		};

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Mempool).toConstantValue(context.mempool);

		context.query = context.app.resolve(Query);
	});

	it("getAll - should return transactions from all sender states", async ({
		query,
		mempool,
		aliceTransaction1,
		aliceTransaction2,
		bobTransaction1,
		bobTransaction2,
	}) => {
		stub(mempool, "getSenderMempools").returnValue([
			{ getFromLatest: () => [aliceTransaction1, aliceTransaction2] },
			{ getFromLatest: () => [bobTransaction1, bobTransaction2] },
		]);

		const result = await query.getAll().all();

		assert.equal(result, [aliceTransaction1, aliceTransaction2, bobTransaction1, bobTransaction2]);
	});

	it("getAllBySender - should return transaction from specific sender state", async ({
		query,
		mempool,
		aliceTransaction1,
		aliceTransaction2,
	}) => {
		const hasSenderMempool = stub(mempool, "hasSenderMempool").returnValue(true);
		const getSenderMempool = stub(mempool, "getSenderMempool").returnValue({
			getFromEarliest: () => [aliceTransaction1, aliceTransaction2],
		});

		const result = await query.getAllBySender(alice).all();

		assert.equal(result, [aliceTransaction1, aliceTransaction2]);
		hasSenderMempool.calledWith(alice);
		getSenderMempool.calledWith(alice);
	});

	it("getAllBySender - should return nothing for an unknown sender", async ({ query, mempool }) => {
		const hasSenderMempool = stub(mempool, "hasSenderMempool").returnValue(false);
		const getSenderMempool = spy(mempool, "getSenderMempool");

		const result = await query.getAllBySender(alice).all();

		assert.equal(result, []);
		hasSenderMempool.calledWith(alice);
		getSenderMempool.neverCalled();
	});

	it("getFromLowestPriority - should return transactions reverse ordered by nonce/fee", async ({
		query,
		mempool,
		aliceTransaction1,
		aliceTransaction2,
		bobTransaction1,
		bobTransaction2,
	}) => {
		stub(mempool, "getSenderMempools").returnValue([
			{ getFromLatest: () => [aliceTransaction2, aliceTransaction1] },
			{ getFromLatest: () => [bobTransaction2, bobTransaction1] },
		]);

		const result = await query.getFromLowestPriority().all();

		assert.equal(result, [aliceTransaction2, aliceTransaction1, bobTransaction2, bobTransaction1]);
	});

	it("getFromHighestPriority - should return transactions order by nonce/fee", async ({
		query,
		mempool,
		aliceTransaction1,
		aliceTransaction2,
		bobTransaction1,
		bobTransaction2,
	}) => {
		stub(mempool, "getSenderMempools").returnValue([
			{ getFromEarliest: () => [aliceTransaction1, aliceTransaction2] },
			{ getFromEarliest: () => [bobTransaction1, bobTransaction2] },
		]);

		const result = await query.getFromHighestPriority().all();

		assert.equal(result, [bobTransaction1, bobTransaction2, aliceTransaction1, aliceTransaction2]);
	});

	it("getFromHighestPriority - should return transactions order by nonce/fee for sender", async ({
		query,
		mempool,
		aliceTransaction1,
		aliceTransaction2,
		bobTransaction1,
		bobTransaction2,
	}) => {
		stub(mempool, "getSenderMempools").returnValue([
			{ getFromEarliest: () => [aliceTransaction1, aliceTransaction2] },
			{ getFromEarliest: () => [bobTransaction1, bobTransaction2] },
		]);

		const result = await query
			.getFromHighestPriority()
			.wherePredicate(async (t) => t.from === bob)
			.all();

		assert.equal(result, [bobTransaction1, bobTransaction2]);
	});

	it("getFromHighestPriority - should skip sender states without transactions", async ({
		query,
		mempool,
		bobTransaction1,
		bobTransaction2,
	}) => {
		stub(mempool, "getSenderMempools").returnValue([
			{ getFromEarliest: () => [] },
			{ getFromEarliest: () => [bobTransaction1, bobTransaction2] },
		]);

		const result = await query.getFromHighestPriority().all();

		assert.equal(result, [bobTransaction1, bobTransaction2]);
	});

	it("getFromHighestPriority - should give equal priorities to the transaction queued first", async ({
		query,
		mempool,
	}) => {
		const a = [10, 7, 7].map((gasPrice, nonce) => makeTransaction("a", BigInt(nonce), gasPrice));
		const b = [7, 9].map((gasPrice, nonce) => makeTransaction("b", BigInt(nonce), gasPrice));
		const c = [makeTransaction("c", 0n, 7)];
		const d = [makeTransaction("d", 0n, 10)];
		stub(mempool, "getSenderMempools").returnValue([a, b, c, d].map((t) => ({ getFromEarliest: () => t })));

		const result = await query.getFromHighestPriority().all();

		assert.equal(result, [a[0], d[0], b[0], b[1], c[0], a[1], a[2]]);
	});

	it("getFromLowestPriority - should give equal priorities to the transaction queued first", async ({
		query,
		mempool,
	}) => {
		const a = [5, 9, 9].map((gasPrice, nonce) => makeTransaction("a", BigInt(2 - nonce), gasPrice));
		const b = [9, 6].map((gasPrice, nonce) => makeTransaction("b", BigInt(1 - nonce), gasPrice));
		const c = [makeTransaction("c", 0n, 9)];
		stub(mempool, "getSenderMempools").returnValue([a, b, c].map((t) => ({ getFromLatest: () => t })));

		const result = await query.getFromLowestPriority().all();

		assert.equal(result, [a[0], b[0], b[1], c[0], a[1], a[2]]);
	});

	it("getFromHighestPriority and getFromLowestPriority - should match re-sorting the senders after every pick", async ({
		query,
		mempool,
	}) => {
		const random = makeRandom(1);
		const senders = Array.from({ length: 200 }, (_, sender) =>
			Array.from({ length: random(8) }, (_, nonce) => makeTransaction(`${sender}`, BigInt(nonce), random(4))),
		);
		stub(mempool, "getSenderMempools").returnValue(
			senders.map((t) => ({ getFromEarliest: () => t, getFromLatest: () => t })),
		);

		const resorted = (sort: (a: Contracts.Crypto.Transaction, b: Contracts.Crypto.Transaction) => number) => {
			const queue = senders.filter((t) => t.length > 0).map((t) => [...t]);
			const result: Contracts.Crypto.Transaction[] = [];
			while (queue.length > 0) {
				queue.sort((a, b) => sort(a[0], b[0]));
				const sender = queue.shift()!;
				result.push(sender.shift()!);
				if (sender.length > 0) {
					queue.push(sender);
				}
			}
			return result;
		};

		assert.equal(
			await query.getFromHighestPriority().all(),
			resorted((a, b) => b.gasPrice - a.gasPrice),
		);
		assert.equal(
			await query.getFromLowestPriority().all(),
			resorted((a, b) => a.gasPrice - b.gasPrice),
		);
	});

	it("getFromHighestPriority and getFromLowestPriority - should not re-sort the senders after every pick", async ({
		query,
		mempool,
	}) => {
		const random = makeRandom(1);
		let reads = 0;
		const senders = Array.from({ length: 4096 }, (_, sender) => {
			const gasPrice = random(1000);
			return [
				Object.defineProperty(makeTransaction(`${sender}`, 0n, gasPrice), "gasPrice", {
					get: () => {
						reads++;
						return gasPrice;
					},
				}),
			];
		});
		stub(mempool, "getSenderMempools").returnValue(
			senders.map((t) => ({ getFromEarliest: () => t, getFromLatest: () => t })),
		);

		for (const getQueryIterable of [() => query.getFromHighestPriority(), () => query.getFromLowestPriority()]) {
			reads = 0;
			assert.length(await getQueryIterable().all(), senders.length);
			// a heap reads about 4 n log n prices, re-sorting after every pick about n^2
			assert.lt(reads, 20 * senders.length * Math.log2(senders.length));
		}
	});

	it("getFromHighestPriority - should keep the transactions of the moment it was queried", async ({
		query,
		mempool,
		aliceTransaction1,
		aliceTransaction2,
		bobTransaction1,
	}) => {
		const aliceTransactions = [aliceTransaction1, aliceTransaction2];
		stub(mempool, "getSenderMempools").returnValue([
			{ getFromEarliest: () => aliceTransactions },
			{ getFromEarliest: () => [bobTransaction1] },
		]);

		const queryIterable = query.getFromHighestPriority();
		aliceTransactions.pop();

		assert.equal(await queryIterable.first(), bobTransaction1);
		assert.equal(await queryIterable.all(), [bobTransaction1, aliceTransaction1, aliceTransaction2]);
	});

	it("getFromLowestPriority - should order no further than the first transaction", async ({
		query,
		mempool,
		aliceTransaction2,
		bobTransaction2,
	}) => {
		const unordered = Object.defineProperty(makeTransaction(alice, 1n, 0), "gasPrice", {
			get: () => {
				throw new Error("ordered beyond the first transaction");
			},
		});
		stub(mempool, "getSenderMempools").returnValue([
			{ getFromLatest: () => [aliceTransaction2, unordered] },
			{ getFromLatest: () => [bobTransaction2] },
		]);

		assert.equal(await query.getFromLowestPriority().first(), aliceTransaction2);
	});

	it("whereHash - should filter transactions by hash", async ({ aliceTransaction1, aliceTransaction2 }) => {
		const queryIterable = new QueryIterable([aliceTransaction1, aliceTransaction2]);
		const result = await queryIterable.whereHash(aliceTransaction2.hash).all();

		assert.equal(result, [aliceTransaction2]);
	});

	it("wherePredicate - should only return transactions matching every predicate", async ({
		aliceTransaction1,
		aliceTransaction2,
		bobTransaction1,
	}) => {
		const queryIterable = new QueryIterable(
			[aliceTransaction1, aliceTransaction2, bobTransaction1],
			async (t) => t.from === alice,
		);

		const result = await queryIterable.wherePredicate(async (t) => t.nonce > 1n).all();

		assert.equal(result, [aliceTransaction2]);
	});

	it("first - should return the first matching transaction", async ({
		aliceTransaction1,
		aliceTransaction2,
		bobTransaction1,
	}) => {
		const queryIterable = new QueryIterable([aliceTransaction1, aliceTransaction2, bobTransaction1]);

		assert.equal(await queryIterable.first(), aliceTransaction1);
		assert.equal(await queryIterable.wherePredicate(async (t) => t.nonce > 1n).first(), aliceTransaction2);
	});

	it("first - should throw when no transaction matches", async ({ aliceTransaction1 }) => {
		await assert.rejects(() => new QueryIterable([]).first(), "Transaction not found");
		await assert.rejects(
			() => new QueryIterable([aliceTransaction1]).whereHash("unknown").first(),
			"Transaction not found",
		);
	});

	it("has - should tell whether any transaction matches", async ({ aliceTransaction1 }) => {
		const queryIterable = new QueryIterable([aliceTransaction1]);

		assert.true(await queryIterable.has());
		assert.false(await queryIterable.whereHash("unknown").has());
	});

	it("first and has - should stop at the first matching transaction", async ({
		aliceTransaction1,
		aliceTransaction2,
		bobTransaction1,
	}) => {
		const checked: Contracts.Crypto.Transaction[] = [];
		const queryIterable = new QueryIterable([aliceTransaction1, aliceTransaction2, bobTransaction1], async (t) => {
			checked.push(t);
			return t.nonce > 1n;
		});

		assert.equal(await queryIterable.first(), aliceTransaction2);
		assert.true(await queryIterable.has());
		assert.equal(checked, [aliceTransaction1, aliceTransaction2, aliceTransaction1, aliceTransaction2]);
	});
});

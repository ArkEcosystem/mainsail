import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Query, QueryIterable } from "./query";

const alice = "0x75545540230d5c3BEf023202d23CB74cFA723376";
const bob = "0xbbe7B35057F3431E001d2b96817e3061B59849c9";

const makeTransaction = (from: string, nonce: bigint, gasPrice: number): Contracts.Crypto.Transaction =>
	({ from, gasPrice, hash: `${from}-${nonce}`, nonce }) as unknown as Contracts.Crypto.Transaction;

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
});

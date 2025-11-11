import { Container } from "@mainsail/container";
import { Identifiers } from "@mainsail/constants";

import { describe } from "../../test-framework/source";
import { BigNumber } from "@mainsail/utils";
import { Query, QueryIterable } from ".";

describe<{
	container: Container;
	mempool: any;
	sender1Transaction100: any;
	sender1Transaction200: any;
	sender2Transaction100: any;
	sender2Transaction200: any;
}>("Query", ({ it, assert, beforeAll, beforeEach, stub }) => {
	beforeAll((context) => {
		context.mempool = {
			getSenderMempool: () => {},
			getSenderMempools: () => {},
			hasSenderMempool: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.TransactionPool.Mempool).toConstantValue(context.mempool);
	});

	beforeEach((context) => {
		context.sender1Transaction100 = {
			data: {
				amount: BigNumber.make(100),
				gasPrice: 100 * 1e9,
				nonce: BigNumber.make(1),
				from: "sender1",
				type: 0,
				version: 2,
			},
			hash: "dummy-tx-id",
			key: "some-key",
			serialized: Buffer.from("dummy"),
			type: 0,
		};

		context.sender1Transaction200 = {
			data: {
				amount: BigNumber.make(100),
				gasPrice: 200 * 1e9,
				nonce: BigNumber.make(2),
				from: "sender1",
				type: 0,
				version: 0,
			},
			hash: "dummy-tx-id-2",
			key: "some-key-2",
			serialized: Buffer.from("dummy-2"),
			type: 0,
		};

		context.sender2Transaction100 = {
			data: {
				amount: BigNumber.make(100),
				gasPrice: 300 * 1e9,
				nonce: BigNumber.make(3),
				from: "sender2",
				type: 1,
				version: 2,
			},
			hash: "dummy-tx-id-3",
			key: "some-key-3",
			serialized: Buffer.from("dummy-3"),
			type: 0,
		};

		context.sender2Transaction200 = {
			data: {
				amount: BigNumber.make(100),
				gasPrice: 400 * 1e9,
				nonce: BigNumber.make(4),
				from: "sender2",
				type: 0,
				version: 2,
			},
			hash: "dummy-tx-id-4",
			key: "some-key-3",
			serialized: Buffer.from("dummy-4"),
			type: 0,
		};
	});

	it("getAll - should return transactions from all sender states", async (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromLatest: () => [context.sender1Transaction100, context.sender1Transaction200] },
			{ getFromLatest: () => [context.sender2Transaction100, context.sender2Transaction200] },
		]);

		const query = context.container.get(Query, { autobind: true });
		const result = await query.getAll().all();

		assert.equal(result, [
			context.sender1Transaction100,
			context.sender1Transaction200,
			context.sender2Transaction100,
			context.sender2Transaction200,
		]);
	});

	it("getAllBySender - should return transaction from specific sender state", async (context) => {
		const hasSenderStub = stub(context.mempool, "hasSenderMempool").returnValueOnce(true);
		const getSenderStub = stub(context.mempool, "getSenderMempool").returnValueOnce({
			getFromEarliest: () => [context.sender1Transaction100, context.sender1Transaction200],
		});

		const query = context.container.get(Query, { autobind: true });
		const result = await query.getAllBySender("sender public key").all();

		assert.equal(result, [context.sender1Transaction100, context.sender1Transaction200]);
		hasSenderStub.calledWith("sender public key");
		getSenderStub.calledWith("sender public key");
	});

	it("getFromLowestPriority - should return transactions reverse ordered by nonce/fee", async (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromLatest: () => [context.sender1Transaction200, context.sender1Transaction100] },
			{ getFromLatest: () => [context.sender2Transaction200, context.sender2Transaction100] },
		]);

		const query = context.container.get(Query, { autobind: true });
		const result = await query.getFromLowestPriority().all();

		assert.equal(result, [
			context.sender1Transaction200,
			context.sender1Transaction100,
			context.sender2Transaction200,
			context.sender2Transaction100,
		]);
	});

	it("getFromHighestPriority - should return transactions order by nonce/fee", async (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromEarliest: () => [context.sender1Transaction100, context.sender1Transaction200] },
			{ getFromEarliest: () => [context.sender2Transaction100, context.sender2Transaction200] },
		]);

		const query = context.container.get(Query, { autobind: true });
		const result = await query.getFromHighestPriority().all();

		assert.equal(result, [
			context.sender2Transaction100,
			context.sender2Transaction200,
			context.sender1Transaction100,
			context.sender1Transaction200,
		]);
	});

	it("getFromHighestPriority - should return transactions order by nonce/fee for sender", async (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromEarliest: () => [context.sender1Transaction100, context.sender1Transaction200] },
			{ getFromEarliest: () => [context.sender2Transaction100, context.sender2Transaction200] },
		]);

		const query = context.container.get(Query, { autobind: true });
		const result = await query
			.getFromHighestPriority()
			.wherePredicate(async (t) => t.data.from === "sender2")
			.all();

		assert.equal(result, [context.sender2Transaction100, context.sender2Transaction200]);
	});

	it("whereHash - should filter transactions by hash", async (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = await queryIterable.whereHash(context.sender1Transaction200.hash).all();

		assert.length(result, 1);
		assert.equal(result[0].hash, context.sender1Transaction200.hash);
	});
});

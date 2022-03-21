import { Container } from "@arkecosystem/core-container";
import { Contracts, Identifiers } from "@arkecosystem/core-contracts";

import { describe } from "../../core-test-framework";
import { BigNumber } from "../../utils";
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
		context.container.bind(Identifiers.TransactionPoolMempool).toConstantValue(context.mempool);
	});

	beforeEach((context) => {
		context.sender1Transaction100 = {
			data: {
				amount: BigNumber.make(100),
				fee: BigNumber.make(100),
				nonce: BigNumber.make(1),
				senderPublicKey: "sender-public-key",
				type: 1,
				version: 2,
			},
			id: "dummy-tx-id",
			key: "some-key",
			serialized: Buffer.from("dummy"),
			type: Contracts.Crypto.TransactionType.Transfer,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
		};

		context.sender1Transaction200 = {
			data: {
				amount: BigNumber.make(100),
				fee: BigNumber.make(200),
				nonce: BigNumber.make(2),
				senderPublicKey: "sender-public-key",
				type: 1,
				version: 2,
			},
			id: "dummy-tx-id-2",
			key: "some-key-2",
			serialized: Buffer.from("dummy-2"),
			type: Contracts.Crypto.TransactionType.ValidatorRegistration,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
		};

		context.sender2Transaction100 = {
			data: {
				amount: BigNumber.make(100),
				fee: BigNumber.make(300),
				nonce: BigNumber.make(3),
				senderPublicKey: "sender-public-key",
				type: 1,
				version: 2,
			},
			id: "dummy-tx-id-3",
			key: "some-key-3",
			serialized: Buffer.from("dummy-3"),
			type: Contracts.Crypto.TransactionType.Transfer,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
		};

		context.sender2Transaction200 = {
			data: {
				amount: BigNumber.make(100),
				fee: BigNumber.make(400),
				nonce: BigNumber.make(4),
				senderPublicKey: "sender-public-key",
				type: 1,
				version: 2,
			},
			id: "dummy-tx-id-4",
			key: "some-key-3",
			serialized: Buffer.from("dummy-4"),
			type: Contracts.Crypto.TransactionType.ValidatorRegistration,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
		};
	});

	it("getAll - should return transactions from all sender states", async (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromLatest: () => [context.sender1Transaction100, context.sender1Transaction200] },
			{ getFromLatest: () => [context.sender2Transaction100, context.sender2Transaction200] },
		]);

		const query = context.container.resolve(Query);
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

		const query = context.container.resolve(Query);
		const result = await query.getAllBySender("sender public key").all();

		assert.equal(result, [context.sender1Transaction100, context.sender1Transaction200]);
		hasSenderStub.calledWith("sender public key");
		getSenderStub.calledWith("sender public key");
	});

	it("getFromLowestPriority - should return transactions reverse ordered by fee", async (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromLatest: () => [context.sender1Transaction200, context.sender1Transaction100] },
			{ getFromLatest: () => [context.sender2Transaction100, context.sender2Transaction200] },
		]);

		const query = context.container.resolve(Query);
		const result = await query.getFromLowestPriority().all();

		assert.equal(result, [
			context.sender1Transaction100,
			context.sender1Transaction200,
			context.sender2Transaction100,
			context.sender2Transaction200,
		]);
	});

	it("getFromHighestPriority - should return transactions order by fee", async (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromEarliest: () => [context.sender1Transaction200, context.sender1Transaction100] },
			{ getFromEarliest: () => [context.sender2Transaction100, context.sender2Transaction200] },
		]);

		const query = context.container.resolve(Query);
		const result = await query.getFromHighestPriority().all();

		assert.equal(result, [
			context.sender2Transaction200,
			context.sender2Transaction100,
			context.sender1Transaction200,
			context.sender1Transaction100,
		]);
	});

	it("whereId - should filter transactions by id", async (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = await queryIterable.whereId(context.sender1Transaction200.id).all();

		assert.length(result, 1);
		assert.equal(result[0].id, context.sender1Transaction200.id);
	});

	it("whereType - should filter transactions by type", async (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = await queryIterable.whereType(Contracts.Crypto.TransactionType.ValidatorRegistration).all();

		assert.length(result, 1);
		assert.equal(result[0].id, context.sender1Transaction200.id);
	});

	it("whereTypeGroup - should filter transactions by typeGroup", async (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = await queryIterable.whereTypeGroup(Contracts.Crypto.TransactionTypeGroup.Core).all();

		assert.equal(result, [context.sender1Transaction100, context.sender1Transaction200]);
	});

	it("whereVersion - should filter transactions by version", async (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = await queryIterable.whereVersion(2).all();

		assert.equal(result, [context.sender1Transaction100, context.sender1Transaction200]);
	});

	it("whereKind - should filter transactions by type and typeGroup", async (context) => {
		const queryIterable = new QueryIterable([
			context.sender1Transaction100,
			context.sender1Transaction200,
			context.sender2Transaction100,
			context.sender2Transaction200,
		]);
		const result = await queryIterable.whereKind(context.sender1Transaction200).all();

		assert.equal(
			result.map((t) => t.id),
			[context.sender1Transaction200.id, context.sender2Transaction200.id],
		);
	});

	it("can chain multiple predicates", async (context) => {
		const queryIterable = new QueryIterable([
			context.sender1Transaction100,
			context.sender1Transaction200,
			context.sender2Transaction100,
			context.sender2Transaction200,
		]);
		const result = await queryIterable
			.whereType(Contracts.Crypto.TransactionType.ValidatorRegistration)
			.whereTypeGroup(Contracts.Crypto.TransactionTypeGroup.Core)
			.all();

		assert.equal(
			result.map((t) => t.id),
			[context.sender1Transaction200.id, context.sender2Transaction200.id],
		);
	});

	it("has - should return true when there are matching transactions", async (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = await queryIterable.whereType(Contracts.Crypto.TransactionType.ValidatorRegistration).has();

		assert.true(result);
	});

	it("has - should return false when there are no matching transactions", async (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = await queryIterable.whereType(Contracts.Crypto.TransactionType.Vote).has();

		assert.false(result);
	});

	it("first - should return first matching transaction", async (context) => {
		const queryIterable = new QueryIterable([
			context.sender1Transaction100,
			context.sender1Transaction200,
			context.sender2Transaction100,
			context.sender2Transaction200,
		]);
		const result = await queryIterable.whereType(Contracts.Crypto.TransactionType.ValidatorRegistration).first();

		assert.equal(result.id, context.sender1Transaction200.id);
	});

	it("first - should throw where there are no matching transactions", (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const check = () => queryIterable.whereType(Contracts.Crypto.TransactionType.Vote).first();

		assert.rejects(check);
	});
});

import { Container } from "@arkecosystem/core-kernel";
import { Enums, Identities, Managers, Transactions } from "@arkecosystem/crypto";
import { describe } from "@arkecosystem/core-test-framework";
import { Query, QueryIterable } from "./";

describe<{
	aip: Boolean;
	container: Container.Container;
	mempool: any;
	sender1Transaction100: any;
	sender1Transaction200: any;
	sender2Transaction100: any;
	sender2Transaction200: any;
}>("Query", ({ it, assert, beforeAll, afterAll, stub }) => {
	beforeAll((context) => {
		context.mempool = {
			getSenderMempools: () => undefined,
			hasSenderMempool: () => undefined,
			getSenderMempool: () => undefined,
		};

		context.container = new Container.Container();
		context.container.bind(Container.Identifiers.TransactionPoolMempool).toConstantValue(context.mempool);

		context.aip = Managers.configManager.getMilestone().aip11;
		Managers.configManager.getMilestone().aip11 = true;

		context.sender1Transaction100 = Transactions.BuilderFactory.transfer()
			.version(2)
			.amount("100")
			.recipientId(Identities.Address.fromPassphrase("recipient's secret"))
			.nonce("1")
			.fee("100")
			.sign("sender1 secret")
			.build();
		context.sender1Transaction200 = Transactions.BuilderFactory.delegateRegistration()
			.usernameAsset("sender1")
			.version(2)
			.nonce("1")
			.fee("200")
			.sign("sender1 secret")
			.build();
		context.sender2Transaction100 = Transactions.BuilderFactory.transfer()
			.version(2)
			.amount("100")
			.recipientId(Identities.Address.fromPassphrase("recipient's secret"))
			.nonce("1")
			.fee("100")
			.sign("sender2 secret")
			.build();
		context.sender2Transaction200 = Transactions.BuilderFactory.delegateRegistration()
			.usernameAsset("sender2")
			.version(2)
			.nonce("1")
			.fee("200")
			.sign("sender2 secret")
			.build();
	});

	afterAll((context) => {
		Managers.configManager.getMilestone().aip11 = context.aip;
	});

	it("getAll - should return transactions from all sender states", (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromLatest: () => [context.sender1Transaction100, context.sender1Transaction200] },
			{ getFromLatest: () => [context.sender2Transaction100, context.sender2Transaction200] },
		]);

		const query = context.container.resolve(Query);
		const result = Array.from(query.getAll());

		assert.equal(result, [
			context.sender1Transaction100,
			context.sender1Transaction200,
			context.sender2Transaction100,
			context.sender2Transaction200,
		]);
	});

	it("getAllBySender - should return transaction from specific sender state", (context) => {
		const hasSenderStub = stub(context.mempool, "hasSenderMempool").returnValueOnce(true);
		const getSenderStub = stub(context.mempool, "getSenderMempool").returnValueOnce({
			getFromEarliest: () => [context.sender1Transaction100, context.sender1Transaction200],
		});

		const query = context.container.resolve(Query);
		const result = Array.from(query.getAllBySender("sender public key"));

		assert.equal(result, [context.sender1Transaction100, context.sender1Transaction200]);
		hasSenderStub.calledWith("sender public key");
		getSenderStub.calledWith("sender public key");
	});

	it("getFromLowestPriority - should return transactions reverse ordered by fee", (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromLatest: () => [context.sender1Transaction200, context.sender1Transaction100] },
			{ getFromLatest: () => [context.sender2Transaction100, context.sender2Transaction200] },
		]);

		const query = context.container.resolve(Query);
		const result = Array.from(query.getFromLowestPriority());

		assert.equal(result, [
			context.sender2Transaction100,
			context.sender1Transaction200,
			context.sender1Transaction100,
			context.sender2Transaction200,
		]);
	});

	it("getFromHighestPriority - should return transactions order by fee", (context) => {
		stub(context.mempool, "getSenderMempools").returnValueOnce([
			{ getFromEarliest: () => [context.sender1Transaction200, context.sender1Transaction100] },
			{ getFromEarliest: () => [context.sender2Transaction100, context.sender2Transaction200] },
		]);

		const query = context.container.resolve(Query);
		const result = Array.from(query.getFromHighestPriority());

		assert.equal(result, [
			context.sender1Transaction200,
			context.sender1Transaction100,
			context.sender2Transaction100,
			context.sender2Transaction200,
		]);
	});

	it("whereId - should filter transactions by id", (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = Array.from(queryIterable.whereId(context.sender1Transaction200.id));

		assert.equal(result, [context.sender1Transaction200]);
	});

	it("whereType - should filter transactions by type", (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = Array.from(queryIterable.whereType(Enums.TransactionType.DelegateRegistration));

		assert.equal(result, [context.sender1Transaction200]);
	});

	it("whereTypeGroup - should filter transactions by typeGroup", (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = Array.from(queryIterable.whereTypeGroup(Enums.TransactionTypeGroup.Core));

		assert.equal(result, [context.sender1Transaction100, context.sender1Transaction200]);
	});

	it("whereVersion - should filter transactions by version", (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = Array.from(queryIterable.whereVersion(2));

		assert.equal(result, [context.sender1Transaction100, context.sender1Transaction200]);
	});

	it("whereKind - should filter transactions by type and typeGroup", (context) => {
		const queryIterable = new QueryIterable([
			context.sender1Transaction100,
			context.sender1Transaction200,
			context.sender2Transaction100,
			context.sender2Transaction200,
		]);
		const result = Array.from(queryIterable.whereKind(context.sender1Transaction200));

		assert.equal(result, [context.sender1Transaction200, context.sender2Transaction200]);
	});

	it("has - should return true when there are matching transactions", (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = queryIterable.whereType(Enums.TransactionType.DelegateRegistration).has();

		assert.true(result);
	});

	it("has - should return false when there are no matching transactions", (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const result = queryIterable.whereType(Enums.TransactionType.Vote).has();

		assert.false(result);
	});

	it("first - should return first matching transaction", (context) => {
		const queryIterable = new QueryIterable([
			context.sender1Transaction100,
			context.sender1Transaction200,
			context.sender2Transaction100,
			context.sender2Transaction200,
		]);
		const result = queryIterable.whereType(Enums.TransactionType.DelegateRegistration).first();

		assert.equal(result, context.sender1Transaction200);
	});

	it("first - should throw where there are no matching transactions", (context) => {
		const queryIterable = new QueryIterable([context.sender1Transaction100, context.sender1Transaction200]);
		const check = () => queryIterable.whereType(Enums.TransactionType.Vote).first();

		assert.throws(check);
	});
});

import { Identifiers } from "@mainsail/constants";
import * as Exceptions from "@mainsail/exceptions";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Processor } from "./processor";

const nextTick = async () => new Promise((resolve) => setImmediate(resolve));

describe<{
	app: Application;
	processor: Processor;
	pool: any;
	broadcaster: any;
	factory: any;
	logger: any;
	transaction1: any;
	transaction2: any;
}>("Processor", ({ it, assert, beforeEach, stub, spy }) => {
	beforeEach((context) => {
		context.transaction1 = { hash: "dummy-tx-hash", serialized: Buffer.from("dummy") };
		context.transaction2 = { hash: "dummy-tx-hash-2", serialized: Buffer.from("dummy-2") };

		context.pool = {
			addTransaction: async () => {},
		};

		context.factory = {
			fromBytes: async () => context.transaction1,
		};

		context.broadcaster = {
			broadcastTransactions: async () => {},
		};

		context.logger = {
			error: () => {},
		};

		context.app = new Application();
		context.app.bind(Identifiers.TransactionPool.Service).toConstantValue(context.pool);
		context.app.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue(context.factory);
		context.app.bind(Identifiers.TransactionPool.Broadcaster).toConstantValue(context.broadcaster);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.processor = context.app.resolve(Processor);
	});

	it("should accept and broadcast all valid transactions", async ({
		processor,
		pool,
		factory,
		broadcaster,
		transaction1,
		transaction2,
	}) => {
		const spiedPool = spy(pool, "addTransaction");
		const spiedBroadcaster = spy(broadcaster, "broadcastTransactions");

		stub(factory, "fromBytes").resolvedValueNth(0, transaction1).resolvedValueNth(1, transaction2);

		const result = await processor.process([transaction1.serialized, transaction2.serialized]);

		spiedPool.calledTimes(2);
		spiedPool.calledNthWith(0, transaction1);
		spiedPool.calledNthWith(1, transaction2);

		spiedBroadcaster.calledOnce();
		spiedBroadcaster.calledWith([transaction1, transaction2]);

		assert.equal(result.accept, [0, 1]);
		assert.equal(result.broadcast, [0, 1]);
		assert.equal(result.invalid, []);
		assert.equal(result.excess, []);
		assert.undefined(result.errors);
	});

	it("should mark transactions with invalid data as invalid", async ({
		processor,
		pool,
		factory,
		broadcaster,
		transaction1,
		transaction2,
	}) => {
		const spiedPool = spy(pool, "addTransaction");
		const spiedBroadcaster = spy(broadcaster, "broadcastTransactions");

		stub(factory, "fromBytes").resolvedValueNth(0, transaction1).rejectedValueNth(1, new Error("malformed buffer"));

		const result = await processor.process([transaction1.serialized, transaction2.serialized]);

		spiedPool.calledOnce();
		spiedBroadcaster.calledOnce();
		spiedBroadcaster.calledWith([transaction1]);

		assert.equal(result.accept, [0]);
		assert.equal(result.broadcast, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.excess, []);
		assert.equal(result.errors["1"].type, "ERR_BAD_DATA");
		assert.equal(result.errors["1"].message, "Invalid transaction data: malformed buffer");
	});

	it("should mark transactions rejected by the pool as invalid", async ({
		processor,
		pool,
		factory,
		broadcaster,
		transaction1,
		transaction2,
	}) => {
		stub(factory, "fromBytes").resolvedValueNth(0, transaction1).resolvedValueNth(1, transaction2);

		const poolStub = stub(pool, "addTransaction")
			.resolvedValueNth(0, undefined)
			.rejectedValueNth(1, new Exceptions.TransactionFeeTooLowError(transaction2));

		const spiedBroadcaster = spy(broadcaster, "broadcastTransactions");

		const result = await processor.process([transaction1.serialized, transaction2.serialized]);

		poolStub.calledTimes(2);
		spiedBroadcaster.calledOnce();
		spiedBroadcaster.calledWith([transaction1]);

		assert.equal(result.accept, [0]);
		assert.equal(result.broadcast, [0]);
		assert.equal(result.invalid, [1]);
		assert.equal(result.excess, []);
		assert.truthy(result.errors["1"]);
		assert.equal(result.errors["1"].type, "ERR_LOW_FEE");
	});

	it("should track excess transactions", async ({ processor, pool, factory, broadcaster, transaction1 }) => {
		stub(factory, "fromBytes").resolvedValue(transaction1);

		const poolStub = stub(pool, "addTransaction").rejectedValueNth(
			0,
			new Exceptions.SenderExceededMaximumTransactionCountError(transaction1, 1),
		);

		const spiedBroadcaster = spy(broadcaster, "broadcastTransactions");

		const result = await processor.process([transaction1.serialized]);

		poolStub.calledOnce();
		spiedBroadcaster.neverCalled();

		assert.equal(result.accept, []);
		assert.equal(result.broadcast, []);
		assert.equal(result.invalid, [0]);
		assert.equal(result.excess, [0]);
		assert.truthy(result.errors["0"]);
		assert.equal(result.errors["0"].type, "ERR_EXCEEDS_MAX_COUNT");
	});

	it("should rethrow unexpected error", async ({ processor, pool, factory, broadcaster, transaction1 }) => {
		stub(factory, "fromBytes").resolvedValue(transaction1);

		const poolStub = stub(pool, "addTransaction").rejectedValueNth(0, new Error("Unexpected error"));
		const spiedBroadcaster = spy(broadcaster, "broadcastTransactions");

		await assert.rejects(
			() => processor.process([transaction1.serialized, transaction1.serialized]),
			"Unexpected error",
		);

		poolStub.calledOnce();
		spiedBroadcaster.neverCalled();
	});

	it("should broadcast already accepted transactions when an unexpected error is rethrown", async ({
		processor,
		pool,
		factory,
		broadcaster,
		transaction1,
		transaction2,
	}) => {
		stub(factory, "fromBytes").resolvedValueNth(0, transaction1).resolvedValueNth(1, transaction2);

		stub(pool, "addTransaction").resolvedValueNth(0, undefined).rejectedValueNth(1, new Error("Unexpected error"));

		const spiedBroadcaster = spy(broadcaster, "broadcastTransactions");

		await assert.rejects(
			() => processor.process([transaction1.serialized, transaction2.serialized]),
			"Unexpected error",
		);

		spiedBroadcaster.calledOnce();
		spiedBroadcaster.calledWith([transaction1]);
	});

	it("should log an error when broadcasting fails", async ({
		processor,
		factory,
		broadcaster,
		logger,
		transaction1,
	}) => {
		stub(factory, "fromBytes").resolvedValue(transaction1);
		stub(broadcaster, "broadcastTransactions").rejectedValue(new Error("Broadcast failed"));

		const spiedLogger = spy(logger, "error");

		const result = await processor.process([transaction1.serialized]);

		assert.equal(result.accept, [0]);
		assert.equal(result.broadcast, [0]);

		await nextTick();

		spiedLogger.calledOnce();
	});
});

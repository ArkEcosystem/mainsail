import { Container } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";

import { describe } from "../../core-test-framework";
import { Processor } from "./processor";

describe<{
	container: Container;
	pool: any;
	extensions: any[];
	transactionBroadcaster: any;
	transaction1: any;
	transaction2: any;
	factory: any;
}>("Processor", ({ it, assert, beforeAll, stub, spy }) => {
	beforeAll((context) => {
		context.pool = {
			addTransaction: () => {},
		};

		context.extensions = [{ throwIfCannotBroadcast: () => {} }, { throwIfCannotBroadcast: () => {} }];

		context.transactionBroadcaster = {
			broadcastTransactions: () => Promise.resolve(),
		};

		context.factory = {
			fromData: () => {},
		};

		context.container = new Container();
		context.container.bind(Identifiers.TransactionPoolProcessorExtension).toConstantValue(context.extensions[0]);
		context.container.bind(Identifiers.TransactionPoolProcessorExtension).toConstantValue(context.extensions[1]);
		context.container.bind(Identifiers.TransactionPoolService).toConstantValue(context.pool);
		context.container.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue(context.factory);
		context.container.bind(Identifiers.Cryptography.Transaction.Deserializer).toConstantValue({});
		context.container.bind(Identifiers.PeerTransactionBroadcaster).toConstantValue(context.transactionBroadcaster);
		context.container.bind(Identifiers.LogService).toConstantValue({
			error: () => {},
		});

		context.transaction1 = {
			data: {
				amount: BigNumber.make(100),
				id: "dummy-tx-id",
				nonce: BigNumber.make(1),
				senderPublicKey: "dummy-sender-key",
				type: Contracts.Crypto.TransactionType.Transfer,
				version: 2,
			},
			id: "dummy-tx-id",
			key: "some-key",
			serialized: Buffer.from("dummy"),
			type: Contracts.Crypto.TransactionType.Transfer,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
		};

		context.transaction2 = {
			data: {
				amount: BigNumber.make(100),
				id: "dummy-tx-id-2",
				nonce: BigNumber.make(1),
				senderPublicKey: "dummy-sender-key",
				type: Contracts.Crypto.TransactionType.Transfer,
				typeGroup: undefined,
				version: 2,
			},
			id: "dummy-tx-id-2",
			key: "some-key",
			serialized: Buffer.from("dummy-2"),
			type: Contracts.Crypto.TransactionType.Transfer,
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
		};
	});

	it("should parse transactions through factory pool", async (context) => {
		const poolSpy = spy(context.pool, "addTransaction");
		const factoryStub = stub(context.factory, "fromData");
		const spiedBroadcaster = spy(context.transactionBroadcaster, "broadcastTransactions");

		factoryStub.resolvedValueNth(0, context.transaction1).resolvedValueNth(1, context.transaction2);

		const spiedExtension0 = stub(context.extensions[0], "throwIfCannotBroadcast");

		spiedExtension0
			.callsFakeNth(0, async (transaction) => {
				throw new Exceptions.TransactionFeeToLowError(transaction);
			})
			.callsFakeNth(1, async (transaction) => {
				throw new Exceptions.TransactionFeeToLowError(transaction);
			});

		const spiedExtension1 = spy(context.extensions[1], "throwIfCannotBroadcast");

		const processor = context.container.resolve(Processor);
		const result = await processor.process([context.transaction1.data, context.transaction2.data]);

		poolSpy.calledTimes(2);
		spiedExtension0.calledTimes(2);
		spiedExtension1.calledTimes(2);
		spiedBroadcaster.neverCalled();

		assert.equal(result.accept, [context.transaction1.id, context.transaction2.id]);
		assert.equal(result.broadcast, []);
		assert.equal(result.invalid, []);
		assert.equal(result.excess, []);
		assert.undefined(result.errors);
	});

	it("should add transactions to pool", async (context) => {
		const poolStub = stub(context.pool, "addTransaction");

		poolStub
			.callsFakeNth(0, async (transaction) => {})
			.callsFakeNth(1, async (transaction) => {
				throw new Exceptions.TransactionFeeToLowError(transaction);
			});

		const spiedExtension0 = spy(context.extensions[0], "throwIfCannotBroadcast");
		const spiedExtension1 = spy(context.extensions[1], "throwIfCannotBroadcast");
		const spiedBroadcaster = spy(context.transactionBroadcaster, "broadcastTransactions");

		const processor = context.container.resolve(Processor);
		const result = await processor.process([context.transaction1.data, context.transaction2.data]);

		poolStub.calledTimes(2);
		spiedExtension0.calledOnce();
		spiedExtension1.calledOnce();
		spiedBroadcaster.calledOnce();

		assert.equal(result.accept, [context.transaction1.id]);
		assert.equal(result.broadcast, [context.transaction1.id]);
		assert.equal(result.invalid, [context.transaction2.id]);
		assert.equal(result.excess, []);
		assert.truthy(result.errors[context.transaction2.id]);
		assert.equal(result.errors[context.transaction2.id].type, "ERR_LOW_FEE");
	});

	it("should add broadcast eligible transaction", async (context) => {
		const poolSpy = spy(context.pool, "addTransaction");

		const spiedExtension0 = stub(context.extensions[0], "throwIfCannotBroadcast");
		const spiedBroadcaster = spy(context.transactionBroadcaster, "broadcastTransactions");

		spiedExtension0
			.callsFakeNth(0, async (transaction) => {})
			.callsFakeNth(1, async (transaction) => {
				throw new Exceptions.TransactionFeeToLowError(transaction);
			});

		const spiedExtension1 = spy(context.extensions[1], "throwIfCannotBroadcast");

		const processor = context.container.resolve(Processor);
		const result = await processor.process([context.transaction1.data, context.transaction2.data]);

		poolSpy.calledTimes(2);
		spiedExtension0.calledTimes(2);
		spiedExtension1.calledTimes(2);
		spiedBroadcaster.called();

		assert.equal(result.accept, [context.transaction1.id, context.transaction2.id]);
		assert.equal(result.broadcast, [context.transaction1.id]);
		assert.equal(result.invalid, []);
		assert.equal(result.excess, []);
		assert.undefined(result.errors);
	});

	it("should rethrow unexpected error", async (context) => {
		const poolStub = stub(context.pool, "addTransaction").rejectedValueNth(0, new Error("Unexpected error"));

		const spiedExtension0 = spy(context.extensions[0], "throwIfCannotBroadcast");
		const spiedExtension1 = spy(context.extensions[1], "throwIfCannotBroadcast");
		const spiedBroadcaster = spy(context.transactionBroadcaster, "broadcastTransactions");

		const processor = context.container.resolve(Processor);
		const promise = processor.process([context.transaction1.data, context.transaction2.data]);

		await assert.rejects(() => promise);

		poolStub.calledOnce();
		spiedExtension0.neverCalled();
		spiedExtension1.neverCalled();
		spiedBroadcaster.neverCalled();
	});

	it("should track excess transactions", async (context) => {
		const exceedsError = new Exceptions.SenderExceededMaximumTransactionCountError(context.transaction1, 1);

		const poolStub = stub(context.pool, "addTransaction").rejectedValueNth(0, exceedsError);
		stub(context.factory, "fromData").returnValue(context.transaction1);

		const spiedExtension0 = spy(context.extensions[0], "throwIfCannotBroadcast");
		const spiedExtension1 = spy(context.extensions[1], "throwIfCannotBroadcast");
		const spiedBroadcaster = spy(context.transactionBroadcaster, "broadcastTransactions");

		const processor = context.container.resolve(Processor);
		const result = await processor.process([context.transaction1.data]);

		poolStub.calledOnce();
		spiedExtension0.neverCalled();
		spiedExtension1.neverCalled();
		spiedBroadcaster.neverCalled();

		assert.equal(result.accept, []);
		assert.equal(result.broadcast, []);
		assert.equal(result.invalid, [context.transaction1.id]);
		assert.equal(result.excess, [context.transaction1.id]);
		assert.truthy(result.errors[context.transaction1.id]);
		assert.equal(result.errors[context.transaction1.id].type, "ERR_EXCEEDS_MAX_COUNT");
	});
});

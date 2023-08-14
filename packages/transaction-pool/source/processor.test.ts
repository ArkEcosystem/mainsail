import { Container } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import crypto from "../../core/bin/config/testnet/crypto.json";
import { describe } from "../../test-framework";
import { Processor } from "./processor";
import { Configuration } from "@mainsail/crypto-config";

describe<{
	container: Container;
	pool: any;
	extensions: any[];
	transactionBroadcaster: any;
	transaction1: any;
	transaction2: any;
	factory: any;
	blockSerializer: any;
}>("Processor", ({ it, assert, beforeAll, stub, spy }) => {
	beforeAll((context) => {
		context.pool = {
			addTransaction: () => { },
		};

		context.extensions = [{ throwIfCannotBroadcast: () => { } }, { throwIfCannotBroadcast: () => { } }];

		context.transactionBroadcaster = {
			broadcastTransactions: () => Promise.resolve(),
		};

		context.factory = {
			fromJson: (tx) => {
				return tx;
			},
		};

		context.blockSerializer = {
			headerSize: () => 152,
		};

		context.container = new Container();
		context.container.bind(Identifiers.Cryptography.Block.Serializer).toConstantValue(context.blockSerializer);
		context.container.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();
		context.container.get<Configuration>(Identifiers.Cryptography.Configuration).setConfig(crypto);

		context.container.bind(Identifiers.TransactionPoolProcessorExtension).toConstantValue(context.extensions[0]);
		context.container.bind(Identifiers.TransactionPoolProcessorExtension).toConstantValue(context.extensions[1]);
		context.container.bind(Identifiers.TransactionPoolService).toConstantValue(context.pool);
		context.container.bind(Identifiers.Cryptography.Transaction.Factory).toConstantValue(context.factory);
		context.container.bind(Identifiers.Cryptography.Transaction.Deserializer).toConstantValue({});
		context.container.bind(Identifiers.PeerBroadcaster).toConstantValue(context.transactionBroadcaster);
		context.container.bind(Identifiers.LogService).toConstantValue({
			error: () => { },
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
		const factoryStub = stub(context.factory, "fromJson");
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

		assert.equal(result.accept, ["0", "1"]);
		assert.equal(result.broadcast, []);
		assert.equal(result.invalid, []);
		assert.equal(result.excess, []);
		assert.undefined(result.errors);
	});

	it("should add transactions to pool", async (context) => {
		const poolStub = stub(context.pool, "addTransaction");

		poolStub
			.callsFakeNth(0, async (transaction) => { })
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

		assert.equal(result.accept, ["0"]);
		assert.equal(result.broadcast, ["0"]);
		assert.equal(result.invalid, ["1"]);
		assert.equal(result.excess, []);
		assert.truthy(result.errors["1"]);
		assert.equal(result.errors["1"].type, "ERR_LOW_FEE");
	});

	it("should add broadcast eligible transaction", async (context) => {
		const poolSpy = spy(context.pool, "addTransaction");

		const spiedExtension0 = stub(context.extensions[0], "throwIfCannotBroadcast");
		const spiedBroadcaster = spy(context.transactionBroadcaster, "broadcastTransactions");

		spiedExtension0
			.callsFakeNth(0, async (transaction) => { })
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

		assert.equal(result.accept, ["0", "1"]);
		assert.equal(result.broadcast, ["0"]);
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
		stub(context.factory, "fromJson").returnValue(context.transaction1);

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
		assert.equal(result.invalid, ["0"]);
		assert.equal(result.excess, ["0"]);
		assert.truthy(result.errors["0"]);
		assert.equal(result.errors["0"].type, "ERR_EXCEEDS_MAX_COUNT");
	});
});

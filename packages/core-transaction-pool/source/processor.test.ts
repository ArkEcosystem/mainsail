import { Container, Contracts } from "@arkecosystem/core-kernel";
import { TransactionFeeToLowError } from "./errors";
import { Processor } from "./processor";
import { Identities, Interfaces, Managers, Transactions } from "@arkecosystem/crypto";
import { describe } from "@arkecosystem/core-test-framework";

const buildTransaction = (nonce: string): Interfaces.ITransaction =>
	Transactions.BuilderFactory.transfer()
		.version(2)
		.amount("100")
		.recipientId(Identities.Address.fromPassphrase("recipient's secret"))
		.nonce(nonce)
		.sign("sender's secret")
		.build();

describe<{
	aip: Boolean;
	container: Container.Container;
	workerPool: any;
	pool: any;
	extensions: any[];
	transactionBroadcaster: any;
	transaction1: Interfaces.ITransaction;
	transaction2: Interfaces.ITransaction;
}>("Processor", ({ it, assert, beforeAll, stub, spy, afterAll }) => {
	beforeAll((context) => {
		context.pool = {
			addTransaction: () => undefined,
		};

		context.extensions = [{ throwIfCannotBroadcast: () => undefined }, { throwIfCannotBroadcast: () => undefined }];

		context.transactionBroadcaster = {
			broadcastTransactions: () => Promise.resolve(),
		};

		context.workerPool = {
			getTransactionFromData: () => undefined,
		};

		context.container = new Container.Container();
		context.container
			.bind(Container.Identifiers.TransactionPoolProcessorExtension)
			.toConstantValue(context.extensions[0]);
		context.container
			.bind(Container.Identifiers.TransactionPoolProcessorExtension)
			.toConstantValue(context.extensions[1]);
		context.container.bind(Container.Identifiers.TransactionPoolService).toConstantValue(context.pool);
		context.container
			.bind(Container.Identifiers.PeerTransactionBroadcaster)
			.toConstantValue(context.transactionBroadcaster);
		context.container.bind(Container.Identifiers.TransactionPoolWorkerPool).toConstantValue(context.workerPool);
		context.container.bind(Container.Identifiers.LogService).toConstantValue({
			error: () => undefined,
		});

		// Build transactions...
		context.transaction1 = buildTransaction("1");
		context.transaction2 = buildTransaction("2");
		context.transaction2.data.typeGroup = undefined;

		context.aip = Managers.configManager.getMilestone().aip11;
		Managers.configManager.getMilestone().aip11 = true;
	});

	afterAll((context) => {
		Managers.configManager.getMilestone().aip11 = context.aip;
	});

	it("should parse transactions through factory pool", async (context) => {
		const poolSpy = spy(context.pool, "addTransaction");
		const workerPoolStub = stub(context.workerPool, "getTransactionFromData");
		const spiedBroadcaster = spy(context.transactionBroadcaster, "broadcastTransactions");

		workerPoolStub.resolvedValueNth(0, context.transaction1).resolvedValueNth(1, context.transaction2);

		const spiedExtension0 = stub(context.extensions[0], "throwIfCannotBroadcast");

		spiedExtension0
			.callsFakeNth(0, async (transaction) => {
				throw new TransactionFeeToLowError(transaction);
			})
			.callsFakeNth(1, async (transaction) => {
				throw new TransactionFeeToLowError(transaction);
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

	it.skip("should wrap deserialize errors into BAD_DATA pool error", async (context) => {
		const processor = context.container.resolve(Processor);

		const workerPoolStub = stub(context.workerPool, "getTransactionFromData").rejectedValueNth(
			0,
			new Error("Version 1 not supported"),
		);

		const result = await processor.process([context.transaction1.data]);

		workerPoolStub.calledWith(context.transaction1.data);

		assert.equal(result.invalid, [context.transaction1.id]);
		assert.equal(result.errors, {
			[context.transaction1.data.id]: {
				type: "ERR_BAD_DATA",
				message: "Invalid transaction data: Version 1 not supported",
			},
		});
	});

	it("should add transactions to pool", async (context) => {
		const poolStub = stub(context.pool, "addTransaction");

		poolStub
			.callsFakeNth(0, async (transaction) => {})
			.callsFakeNth(1, async (transaction) => {
				throw new TransactionFeeToLowError(transaction);
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
				throw new TransactionFeeToLowError(transaction);
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
		const exceedsError = new Contracts.TransactionPool.PoolError("Exceeds", "ERR_EXCEEDS_MAX_COUNT");

		const poolStub = stub(context.pool, "addTransaction").rejectedValueNth(0, exceedsError);

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

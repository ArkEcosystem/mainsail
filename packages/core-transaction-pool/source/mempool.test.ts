import { Container } from "@arkecosystem/core-kernel";
import { Identities, Interfaces } from "@arkecosystem/crypto";
import { describe } from "@arkecosystem/core-test-framework";
import { Mempool } from "./";

describe<{
	container: Container.Container;
	logger: any;
	createSenderMempool: any;
}>("Mempool", ({ it, beforeAll, assert, afterEach, spy, spyFn, stubFn }) => {
	beforeAll((context) => {
		context.createSenderMempool = stubFn();
		context.logger = { debug: () => undefined };

		context.container = new Container.Container();
		context.container
			.bind(Container.Identifiers.TransactionPoolSenderMempoolFactory)
			.toConstantValue(context.createSenderMempool);
		context.container.bind(Container.Identifiers.LogService).toConstantValue(context.logger);
	});

	afterEach((context) => {
		context.createSenderMempool.reset();
	});

	it("getSize - should return sum of transaction counts of sender states", async (context) => {
		const senderMempool1 = {
			addTransaction: () => undefined,
			getSize: stubFn().returns(10),
			isDisposable: stubFn().returns(false),
		};

		const senderMempool2 = {
			addTransaction: () => undefined,
			getSize: stubFn().returns(20),
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool1).onSecondCall().returns(senderMempool2);

		const transaction1 = {
			id: "transaction1-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const transaction2 = {
			id: "transaction2-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender2") },
		} as Interfaces.ITransaction;

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction1);
		await memory.addTransaction(transaction2);
		const size = memory.getSize();

		assert.equal(size, 30);
	});

	it("hasSenderMempool - should return true if sender's transaction was added previously", async (context) => {
		const senderMempool = {
			addTransaction: () => undefined,
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender") },
		} as Interfaces.ITransaction;

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		assert.true(has);
	});

	it("hasSenderMempool - should return false if sender's transaction wasn't added previously", async (context) => {
		const senderMempool = {
			addTransaction: () => undefined,
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender") },
		} as Interfaces.ITransaction;

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const has = memory.hasSenderMempool(Identities.PublicKey.fromPassphrase("not sender"));

		assert.false(has);
	});

	it("getSenderMempool - should return sender state if sender's transaction was added previously", async (context) => {
		const senderMempool = {
			addTransaction: () => undefined,
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender") },
		} as Interfaces.ITransaction;

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);

		assert.equal(memory.getSenderMempool(transaction.data.senderPublicKey), senderMempool);
	});

	it("getSenderMempool - should throw if sender's transaction wasn't added previously", async (context) => {
		const senderMempool = {
			addTransaction: () => undefined,
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender") },
		} as Interfaces.ITransaction;

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const cb = () => memory.getSenderMempool(Identities.PublicKey.fromPassphrase("not sender"));

		assert.throws(cb);
	});

	it("getSenderMempools - should return all sender states", async (context) => {
		const senderMempool1 = {
			addTransaction: () => undefined,
			isDisposable: stubFn().returns(false),
		};

		const senderMempool2 = {
			addTransaction: () => undefined,
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool1).onSecondCall().returns(senderMempool2);

		const transaction1 = {
			id: "transaction1-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const transaction2 = {
			id: "transaction2-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender2") },
		} as Interfaces.ITransaction;

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction1);
		await memory.addTransaction(transaction2);
		const senderMempools = memory.getSenderMempools();

		assert.equal(Array.from(senderMempools), [senderMempool1, senderMempool2]);
	});

	it("addTransaction - should add transaction to sender state", async (context) => {
		const senderMempool = {
			addTransaction: spyFn(),
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const loggerSpy = spy(context.logger, "debug");

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);

		assert.true(senderMempool.addTransaction.calledWith(transaction));
		loggerSpy.calledOnce();
	});

	it("addTransaction - should forget sender state if it's empty even if error was thrown", async (context) => {
		const error = new Error("Something went horribly wrong");

		const senderMempool = {
			addTransaction: stubFn().rejects(error),
			isDisposable: stubFn().returns(true),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const loggerSpy = spy(context.logger, "debug");

		const memory = context.container.resolve(Mempool);
		const promise = memory.addTransaction(transaction);

		await assert.rejects(() => promise, "Something went horribly wrong");

		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		loggerSpy.calledTimes(2);
		assert.false(has);
	});

	it("removeTransaction - should return empty array when removing transaction of sender that wasn't previously added", async (context) => {
		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const memory = context.container.resolve(Mempool);
		const removedTransactions = await memory.removeTransaction(transaction.data.senderPublicKey, transaction.id);

		assert.equal(removedTransactions, []);
	});

	it("removeTransaction - should remove previously added transaction and return list of removed transactions", async (context) => {
		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const senderMempool = {
			addTransaction: () => undefined,
			removeTransaction: stubFn().returns([transaction]),
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const loggerSpy = spy(context.logger, "debug");

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const removedTransactions = await memory.removeTransaction(transaction.data.senderPublicKey, transaction.id);

		assert.true(senderMempool.removeTransaction.calledWith(transaction.id));
		assert.equal(removedTransactions, [transaction]);
		loggerSpy.calledOnce();
	});

	it("removeTransaction - should forget sender state if it's empty even if error was thrown", async (context) => {
		const error = new Error("Something went horribly wrong");
		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const senderMempool = {
			addTransaction: () => undefined,
			removeTransaction: stubFn().rejects(error),
			isDisposable: stubFn().onFirstCall().returns(false).onSecondCall().returns(true),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const loggerSpy = spy(context.logger, "debug");

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const promise = memory.removeTransaction(transaction.data.senderPublicKey, transaction.id);

		await assert.rejects(() => promise, "Something went horribly wrong");

		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		loggerSpy.calledTimes(2);
		assert.false(has);
	});

	it("removeForgedTransaction - should return empty array when accepting transaction of sender that wasn't previously added", async (context) => {
		const memory = context.container.resolve(Mempool);
		const removedTransactions = await memory.removeForgedTransaction(
			Identities.PublicKey.fromPassphrase("sender1"),
			"none",
		);

		assert.equal(removedTransactions, []);
	});

	it("removeForgedTransaction - should remove previously added transaction and return list of removed transactions", async (context) => {
		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const senderMempool = {
			addTransaction: () => undefined,
			removeForgedTransaction: stubFn().returns([transaction]),
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const loggerSpy = spy(context.logger, "debug");

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const removedTransactions = await memory.removeForgedTransaction(
			transaction.data.senderPublicKey,
			transaction.id,
		);

		assert.true(senderMempool.removeForgedTransaction.calledWith(transaction.id));
		assert.equal(removedTransactions, [transaction]);
		loggerSpy.calledOnce();
	});

	it("removeForgedTransaction - should forget sender state if it's empty even if error was thrown", async (context) => {
		const error = new Error("Something went horribly wrong");
		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const senderMempool = {
			addTransaction: () => undefined,
			removeForgedTransaction: stubFn().rejects(error),
			isDisposable: stubFn().onFirstCall().returns(false).onSecondCall().returns(true),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const loggerSpy = spy(context.logger, "debug");

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);
		const promise = memory.removeForgedTransaction(transaction.data.senderPublicKey, transaction.id);

		await assert.rejects(() => promise, "Something went horribly wrong");

		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		loggerSpy.calledTimes(2);
		assert.false(has);
	});

	it("flush - should remove all sender states", async (context) => {
		const senderMempool = {
			addTransaction: () => undefined,
			isDisposable: stubFn().returns(false),
		};

		context.createSenderMempool.onFirstCall().returns(senderMempool);

		const transaction = {
			id: "transaction-id",
			data: { senderPublicKey: Identities.PublicKey.fromPassphrase("sender1") },
		} as Interfaces.ITransaction;

		const memory = context.container.resolve(Mempool);
		await memory.addTransaction(transaction);
		memory.flush();
		const has = memory.hasSenderMempool(transaction.data.senderPublicKey);

		assert.false(has);
	});
});

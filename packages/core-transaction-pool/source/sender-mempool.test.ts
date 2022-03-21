import { BigNumber } from "./../../utils/source/big-number";
import { describe } from "../../core-test-framework";
import { SenderMempool } from "./";
import { Container } from "@arkecosystem/core-container";
import { Contracts, Exceptions, Identifiers } from "@arkecosystem/core-contracts";

describe<{
	container: Container;
	configuration: any;
	senderState: any;
	transactions: Contracts.Crypto.ITransaction[];
}>("SenderMempool.", ({ it, assert, beforeAll, stub, spy }) => {
	beforeAll(async (context) => {
		context.configuration = {
			getRequired: () => undefined,
			getOptional: () => undefined,
		};

		context.senderState = {
			apply: () => undefined,
			revert: () => undefined,
		};

		context.container = new Container();
		context.container.bind(Identifiers.PluginConfiguration).toConstantValue(context.configuration);
		context.container.bind(Identifiers.TransactionPoolSenderState).toConstantValue(context.senderState);

		const tx1 = {
			id: "dummy-tx-id",
			typeGroup: 1,
			type: 1,
			key: "some-key",
			data: {
				type: 1,
				nonce: BigNumber.make(1),
				fee: BigNumber.make(900),
				amount: BigNumber.make(100),
				senderPublicKey: "dummy-sender-key",
			},
			serialized: Buffer.from("dummy"),
		};

		const tx2 = {
			id: "dummy-tx-id-2",
			typeGroup: 1,
			type: 1,
			key: "some-key-2",
			data: {
				type: 1,
				nonce: BigNumber.make(2),
				fee: BigNumber.make(900),
				amount: BigNumber.make(100),
				senderPublicKey: "dummy-sender-key",
			},
			serialized: Buffer.from("dummy-2"),
		};

		const tx3 = {
			id: "dummy-tx-id-3",
			typeGroup: 1,
			type: 1,
			key: "some-key-3",
			data: {
				type: 1,
				nonce: BigNumber.make(3),
				fee: BigNumber.make(900),
				amount: BigNumber.make(100),
				senderPublicKey: "dummy-sender-key",
			},
			serialized: Buffer.from("dummy-3"),
		};

		// @ts-ignore
		context.transactions = [tx1, tx2, tx3];
	});

	it("isDisposable - should return true initially", (context) => {
		const senderMempool = context.container.resolve(SenderMempool);
		const empty = senderMempool.isDisposable();

		assert.true(empty);
	});

	it("isDisposable - should return false after transaction was added", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		const empty = senderMempool.isDisposable();

		assert.false(empty);
	});

	it("getSize - should return added transactions count", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		await senderMempool.addTransaction(context.transactions[1]);
		await senderMempool.addTransaction(context.transactions[2]);
		const size = senderMempool.getSize();

		assert.equal(size, 3);
	});

	it("getFromEarliest - should return transactions in order they were added", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		await senderMempool.addTransaction(context.transactions[1]);
		await senderMempool.addTransaction(context.transactions[2]);
		const addedTransactions = senderMempool.getFromEarliest();

		assert.equal(addedTransactions, [context.transactions[0], context.transactions[1], context.transactions[2]]);
	});

	it("getFromLatest - should return transactions in reverse order they were added", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		await senderMempool.addTransaction(context.transactions[1]);
		await senderMempool.addTransaction(context.transactions[2]);
		const addedTransactions = senderMempool.getFromLatest();

		assert.equal(addedTransactions, [context.transactions[2], context.transactions[1], context.transactions[0]]);
	});

	it("addTransaction - should apply transaction to sender state", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender
		const applySpy = spy(context.senderState, "apply");

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);

		applySpy.calledWith(context.transactions[0]);
	});

	it("addTransaction - should throw when sender exceeded maximum transaction count", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(0); // maxTransactionsPerSender
		stub(context.configuration, "getOptional").returnValueOnce([]); // allowedSenders

		const senderMempool = context.container.resolve(SenderMempool);
		const promise = senderMempool.addTransaction(context.transactions[0]);

		await assert.rejects(() => promise);

		promise.catch((err) => {
			assert.instance(err, Exceptions.SenderExceededMaximumTransactionCountError);
			assert.equal(err.type, "ERR_EXCEEDS_MAX_COUNT");
		});
	});

	it("addTransaction - should apply transaction to sender state when sender exceeded maximum transaction count but is included in allowedSenders", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(0); // maxTransactionsPerSender
		stub(context.configuration, "getOptional").returnValueOnce(["dummy-sender-key"]); // allowedSenders
		const applySpy = spy(context.senderState, "apply");

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);

		applySpy.calledWith(context.transactions[0]);
	});

	it("removeTransaction - should revert transaction that was previously applied to sender state", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender
		const revertSpy = spy(context.senderState, "revert");

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		await senderMempool.removeTransaction(context.transactions[0].id);

		revertSpy.calledWith(context.transactions[0]);
	});

	it("removeTransaction - should return empty array when removing transaction that wasn't previously added", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		const removedTransactions = await senderMempool.removeTransaction(context.transactions[1].id);
		const remainingTransactions = senderMempool.getFromEarliest();

		assert.equal(removedTransactions, []);
		assert.equal(remainingTransactions, [context.transactions[0]]);
	});

	it("removeTransaction - should return all transactions that were added after one being removed", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		await senderMempool.addTransaction(context.transactions[1]);
		await senderMempool.addTransaction(context.transactions[2]);

		const removedTransactions = await senderMempool.removeTransaction(context.transactions[1].id);
		const remainingTransactions = senderMempool.getFromEarliest();

		assert.equal(removedTransactions, [context.transactions[2], context.transactions[1]]);
		assert.equal(remainingTransactions, [context.transactions[0]]);
	});

	it("removeTransaction - should return all added transactions when revert failed", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender
		stub(context.senderState, "revert").rejectedValue(new Error("Something wrong"));

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		await senderMempool.addTransaction(context.transactions[1]);
		await senderMempool.addTransaction(context.transactions[2]);

		const removedTransactions = await senderMempool.removeTransaction(context.transactions[1].id);
		const remainingTransactions = senderMempool.getFromEarliest();

		assert.equal(removedTransactions, [context.transactions[2], context.transactions[1], context.transactions[0]]);
		assert.equal(remainingTransactions, []);
	});

	it("removeForgedTransaction - should return all transactions that were added before transaction being accepted", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		await senderMempool.addTransaction(context.transactions[1]);
		await senderMempool.addTransaction(context.transactions[2]);

		const removedTransactions = await senderMempool.removeForgedTransaction(context.transactions[1].id);
		const remainingTransactions = senderMempool.getFromEarliest();

		assert.equal(removedTransactions, [context.transactions[0], context.transactions[1]]);
		assert.equal(remainingTransactions, [context.transactions[2]]);
	});

	it("removeForgedTransaction - should return no transactions when accepting unknown transaction", async (context) => {
		stub(context.configuration, "getRequired").returnValueOnce(10); // maxTransactionsPerSender

		const senderMempool = context.container.resolve(SenderMempool);
		await senderMempool.addTransaction(context.transactions[0]);
		await senderMempool.addTransaction(context.transactions[1]);

		const removedTransactions = await senderMempool.removeForgedTransaction(context.transactions[2].id);
		const remainingTransactions = senderMempool.getFromEarliest();

		assert.equal(removedTransactions, []);
		assert.equal(remainingTransactions, [context.transactions[0], context.transactions[1]]);
	});
});

import { describe } from "../../core-test-framework";
import {
	transaction as transactionDataFixture,
	transaction as transactionFixture,
} from "../../test/fixtures/transaction";
import { createRandomTx } from "../../test/support";
import { InvalidTransactionBytesError, TransactionSchemaError, UnkownTransactionError } from "../errors";
import { ITransactionData, ITransactionJson, NetworkConfig } from "../interfaces";
import { configManager } from "../managers";
import { BigNumber } from "../utils/bignum";
import { Serializer, Transaction, TransactionFactory, Utils as TransactionUtils } from ".";

const transaction = TransactionFactory.fromData(transactionFixture);
const transactionJson = transaction.toJson();
const transactionSerialized = Serializer.serialize(transaction);

describe<{
	config: NetworkConfig;
	transactionData: ITransactionData;
	transactionDataJSON: ITransactionJson;
}>("TransactionFactory", ({ it, assert, beforeAll, beforeEach, afterAll }) => {
	beforeAll((context) => {
		context.config = configManager.all();
	});

	beforeEach((context) => {
		configManager.setFromPreset("devnet");

		context.transactionData = { ...transactionDataFixture };
		context.transactionDataJSON = {
			...context.transactionData,

			amount: context.transactionData.amount.toFixed(),
			fee: context.transactionData.fee.toFixed(),
			nonce: context.transactionData.nonce?.toFixed(),
		};
	});

	afterAll((context) => {
		configManager.setConfig(context.config);
	});

	it("fromHex - should pass to create a transaction from hex", (context) => {
		const tx = TransactionFactory.fromHex(transactionSerialized.toString("hex")).data;

		// @ts-ignore
		tx.amount = BigNumber.make(tx.amount).toFixed();
		// @ts-ignore
		tx.fee = BigNumber.make(tx.fee).toFixed();

		assert.equal(tx, transactionFixture);
	});

	it("fromHex - should fail to create a transaction from hex that contains malformed bytes", (context) => {
		assert.throws(
			() => TransactionFactory.fromHex("deadbeef"),
			(error) => error instanceof InvalidTransactionBytesError,
		);
	});

	it("fromBytes - should pass to create a transaction from a buffer", (context) => {
		const tx = TransactionFactory.fromBytes(transactionSerialized).data;

		// @ts-ignore
		tx.amount = BigNumber.make(tx.amount).toFixed();
		// @ts-ignore
		tx.fee = BigNumber.make(tx.fee).toFixed();

		assert.equal(tx, transactionFixture);
	});

	it("fromBytes - should fail to create a transaction from a buffer that contains malformed bytes", (context) => {
		assert.throws(
			() => TransactionFactory.fromBytes(Buffer.from("deadbeef")),
			(error) => error instanceof InvalidTransactionBytesError,
		);
	});

	it("fromBytesUnsafe - should pass to create a transaction from a buffer", (context) => {
		const tx = TransactionFactory.fromBytesUnsafe(transactionSerialized).data;

		// @ts-ignore
		tx.amount = BigNumber.make(tx.amount).toFixed();
		// @ts-ignore
		tx.fee = BigNumber.make(tx.fee).toFixed();

		assert.equal(tx, transactionFixture);
	});

	it("fromBytesUnsafe - should fail to create a transaction from a buffer that contains malformed bytes", (context) => {
		assert.throws(
			() => TransactionFactory.fromBytesUnsafe(Buffer.from("deadbeef")),
			(error) => error instanceof InvalidTransactionBytesError,
		);
	});

	// Old tests
	it("fromBytesUnsafe - should be ok", (context) => {
		const bytes = TransactionUtils.toBytes(context.transactionData);
		const id = context.transactionData.id;

		const transaction = TransactionFactory.fromBytesUnsafe(bytes, id);
		assert.instance(transaction, Transaction);
		delete context.transactionDataJSON.typeGroup;
		assert.equal(transaction.toJson(), context.transactionDataJSON);
	});

	it("fromData - should pass to create a transaction from an object", (context) => {
		const tx = TransactionFactory.fromData(transaction.data).data;

		// @ts-ignore
		tx.amount = BigNumber.make(tx.amount).toFixed();
		// @ts-ignore
		tx.fee = BigNumber.make(tx.fee).toFixed();

		assert.equal(tx, transactionFixture);
	});

	it("fromData - should fail to create a transaction from an object that contains malformed data", (context) => {
		assert.throws(
			() =>
				TransactionFactory.fromData({
					...transaction.data,
					fee: BigNumber.make(0),
				}),
			(error) => error instanceof TransactionSchemaError,
		);
	});

	// Old tests
	it("fromData - should match transaction id", (context) => {
		configManager.setFromPreset("testnet");
		for (const transaction of [0, 2, 3].map((type) => createRandomTx(type))) {
			const originalId = transaction.data.id;
			const newTransaction = TransactionFactory.fromData(transaction.data);
			assert.equal(newTransaction.data.id, originalId);
		}
	});

	it("fromData - should throw when getting garbage", (context) => {
		assert.throws(
			() => TransactionFactory.fromData({} as ITransactionData),
			(error) => error instanceof UnkownTransactionError,
		);
		assert.throws(
			() => TransactionFactory.fromData({ type: 0 } as ITransactionData),
			(error) => error instanceof TransactionSchemaError,
		);
	});

	it("fromJson - should pass to create a transaction from JSON", (context) => {
		const tx = TransactionFactory.fromJson(transactionJson).data;

		// @ts-ignore
		tx.amount = BigNumber.make(tx.amount).toFixed();
		// @ts-ignore
		tx.fee = BigNumber.make(tx.fee).toFixed();

		assert.equal(tx, transactionFixture);
	});

	it("fromJson - should fail to create a transaction from JSON that contains malformed data", (context) => {
		assert.throws(
			() =>
				TransactionFactory.fromJson({
					...transactionJson,
					senderPublicKey: "something",
				}),
			(error) => error instanceof TransactionSchemaError,
		);
	});
});

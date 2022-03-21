import { Contracts, Exceptions } from "@arkecosystem/core-contracts";
import { BigNumber } from "@arkecosystem/utils";
import { describe } from "../../core-test-framework";

describe<{
	transaction: any;
}>("Errors", ({ it, assert, beforeAll }) => {
	beforeAll((context) => {
		context.transaction = {
			id: "dummy-tx-id",
			typeGroup: Contracts.Crypto.TransactionTypeGroup.Core,
			type: Contracts.Crypto.TransactionType.Transfer,
			key: "some-key",
			data: {
				id: "dummy-tx-id",
				type: Contracts.Crypto.TransactionType.Transfer,
				version: 2,
				network: 30,
				nonce: BigNumber.make(1),
				fee: BigNumber.make(900),
				amount: BigNumber.make(100),
				senderPublicKey: "dummy-sender-key",
			},
			serialized: Buffer.from("dummy"),
		};
	});

	it("RetryTransactionError", (context) => {
		const error = new Exceptions.RetryTransactionError(context.transaction);

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_RETRY");
		assert.equal(error.message, `${context.transaction} cannot be added to pool, please retry`);
	});

	it("TransactionAlreadyInPoolError", (context) => {
		const error = new Exceptions.TransactionAlreadyInPoolError(context.transaction);

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_DUPLICATE");
		assert.equal(error.message, `${context.transaction} is already in pool`);
	});

	it("TransactionExceedsMaximumByteSizeError", (context) => {
		const error = new Exceptions.TransactionExceedsMaximumByteSizeError(context.transaction, 1024);

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_TOO_LARGE");
		assert.equal(error.message, `${context.transaction} exceeds size limit of bytes`);
	});

	it("TransactionHasExpiredError", (context) => {
		const error = new Exceptions.TransactionHasExpiredError(context.transaction, 100);

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_EXPIRED");
		assert.equal(error.message, `${context.transaction} expired at height 100`);
	});

	it("TransactionFeeToLowError", (context) => {
		const error = new Exceptions.TransactionFeeToLowError(context.transaction);

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_LOW_FEE");
		assert.equal(error.message, `${context.transaction} fee is to low to enter the pool`);
	});

	it("SenderExceededMaximumTransactionCountError", (context) => {
		const error = new Exceptions.SenderExceededMaximumTransactionCountError(context.transaction, 1);

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_EXCEEDS_MAX_COUNT");
		assert.equal(error.message, `${context.transaction} exceeds sender's transaction count limit`);
	});

	it("TransactionPoolFullError", (context) => {
		const error = new Exceptions.TransactionPoolFullError(context.transaction, new BigNumber(1000));

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_POOL_FULL");
		assert.equal(error.message, `${context.transaction} fee 900 is lower than 1000 already in pool`);
	});

	it("TransactionFailedToApplyError", (context) => {
		const error = new Exceptions.TransactionFailedToApplyError(
			context.transaction,
			new Error("Something went horribly wrong"),
		);

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_APPLY");
		assert.equal(error.message, `${context.transaction} cannot be applied: Something went horribly wrong`);
	});

	it("TransactionFailedToVerifyError", (context) => {
		const error = new Exceptions.TransactionFailedToVerifyError(context.transaction);

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_BAD_DATA");
		assert.equal(error.message, `${context.transaction} didn't passed verification`);
	});

	it("TransactionFromWrongNetworkError", (context) => {
		const error = new Exceptions.TransactionFromWrongNetworkError(context.transaction, 23);

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_WRONG_NETWORK");
		assert.equal(error.message, `${context.transaction} network 30 doesn't match node's network 23`);
	});

	it("InvalidTransactionDataError", (context) => {
		const error = new Exceptions.InvalidTransactionDataError("Version 1 not supported");

		assert.instance(error, Exceptions.PoolError);
		assert.equal(error.type, "ERR_BAD_DATA");
		assert.equal(error.message, "Invalid transaction data: Version 1 not supported");
	});
});

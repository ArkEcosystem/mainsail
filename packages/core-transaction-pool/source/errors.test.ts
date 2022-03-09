import { Contracts } from "@arkecosystem/core-kernel";
import { describe } from "@arkecosystem/core-test-framework";
import { Identities, Managers, Transactions, Utils } from "@arkecosystem/crypto";
import { Interfaces } from "@arkecosystem/crypto";
import {
	InvalidTransactionDataError,
	RetryTransactionError,
	SenderExceededMaximumTransactionCountError,
	TransactionAlreadyInPoolError,
	TransactionExceedsMaximumByteSizeError,
	TransactionFailedToApplyError,
	TransactionFailedToVerifyError,
	TransactionFeeToLowError,
	TransactionFromFutureError,
	TransactionFromWrongNetworkError,
	TransactionHasExpiredError,
	TransactionPoolFullError,
} from "./errors";

// DLaFiYprzZU2DwV1KPYcDfPr2MJFLSznU7#1 918fa01e Transfer v2
// console.log(String(transaction));

describe<{
	transaction: Interfaces.ITransaction;
	aip: Boolean;
}>("Errors", ({ it, assert, beforeAll, afterAll }) => {
	beforeAll((context) => {
		context.aip = Managers.configManager.getMilestone().aip11;

		Managers.configManager.getMilestone().aip11 = true;

		context.transaction = Transactions.BuilderFactory.transfer()
			.version(2)
			.amount("100")
			.recipientId(Identities.Address.fromPassphrase("recipient's secret"))
			.nonce("1")
			.fee("900")
			.sign("sender's secret")
			.build();
	});

	afterAll((context) => {
		Managers.configManager.getMilestone().aip11 = context.aip;
	});

	it("RetryTransactionError", (context) => {
		const error = new RetryTransactionError(context.transaction);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_RETRY");
		assert.equal(error.message, `${context.transaction} cannot be added to pool, please retry`);
	});

	it("TransactionAlreadyInPoolError", (context) => {
		const error = new TransactionAlreadyInPoolError(context.transaction);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_DUPLICATE");
		assert.equal(error.message, `${context.transaction} is already in pool`);
	});

	it("TransactionExceedsMaximumByteSizeError", (context) => {
		const error = new TransactionExceedsMaximumByteSizeError(context.transaction, 1024);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_TOO_LARGE");
		assert.equal(error.message, `${context.transaction} exceeds size limit of 1024 bytes`);
	});

	it("TransactionHasExpiredError", (context) => {
		const error = new TransactionHasExpiredError(context.transaction, 100);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_EXPIRED");
		assert.equal(error.message, `${context.transaction} expired at height 100`);
	});

	it("TransactionFeeToLowError", (context) => {
		const error = new TransactionFeeToLowError(context.transaction);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_LOW_FEE");
		assert.equal(error.message, `${context.transaction} fee is to low to enter the pool`);
	});

	it("SenderExceededMaximumTransactionCountError", (context) => {
		const error = new SenderExceededMaximumTransactionCountError(context.transaction, 1);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_EXCEEDS_MAX_COUNT");
		assert.equal(error.message, `${context.transaction} exceeds sender's 1 transaction count limit`);
	});

	it("TransactionPoolFullError", (context) => {
		const error = new TransactionPoolFullError(context.transaction, new Utils.BigNumber(1000));

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_POOL_FULL");
		assert.equal(error.message, `${context.transaction} fee 0.000009 DѦ is lower than 0.00001 DѦ already in pool`);
	});

	it("TransactionFailedToApplyError", (context) => {
		const error = new TransactionFailedToApplyError(
			context.transaction,
			new Error("Something went horribly wrong"),
		);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_APPLY");
		assert.equal(error.message, `${context.transaction} cannot be applied: Something went horribly wrong`);
	});

	it("TransactionFailedToVerifyError", (context) => {
		const error = new TransactionFailedToVerifyError(context.transaction);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_BAD_DATA");
		assert.equal(error.message, `${context.transaction} didn't passed verification`);
	});

	it("TransactionFromFutureError", (context) => {
		const error = new TransactionFromFutureError(context.transaction, 1);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_FROM_FUTURE");
		assert.equal(error.message, `${context.transaction} is 1 second in future`);
	});

	it("TransactionFromWrongNetworkError", (context) => {
		const error = new TransactionFromWrongNetworkError(context.transaction, 23);

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_WRONG_NETWORK");
		assert.equal(error.message, `${context.transaction} network 30 doesn't match node's network 23`);
	});

	it("InvalidTransactionDataError", (context) => {
		const error = new InvalidTransactionDataError("Version 1 not supported");

		assert.instance(error, Contracts.TransactionPool.PoolError);
		assert.equal(error.type, "ERR_BAD_DATA");
		assert.equal(error.message, "Invalid transaction data: Version 1 not supported");
	});
});

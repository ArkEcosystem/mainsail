import pluralize from "plur";

import { ITransaction } from "../contracts/crypto";
import { Exception } from "./base";

export class PoolError extends Exception {
	public readonly type: string;

	public constructor(message: string, type: string) {
		super(message);
		this.type = type;
	}
}

export class RetryTransactionError extends PoolError {
	public constructor(transaction: ITransaction) {
		super(`${transaction} cannot be added to pool, please retry`, "ERR_RETRY");
	}
}

export class TransactionAlreadyInPoolError extends PoolError {
	public constructor(transaction: ITransaction) {
		super(`${transaction} is already in pool`, "ERR_DUPLICATE");
	}
}

export class TransactionExceedsMaximumByteSizeError extends PoolError {
	public readonly maxSize: number;

	public constructor(transaction: ITransaction, maxSize: number) {
		super(
			`${transaction} exceeds size limit of ${pluralize("byte", maxSize)}`,
			"ERR_TOO_LARGE", // ! should be "ERR_TO_LARGE" instead of "ERR_TOO_LARGE"
		);
		this.maxSize = maxSize;
	}
}

export class TransactionHasExpiredError extends PoolError {
	public readonly expirationHeight: number;

	public constructor(transaction: ITransaction, expirationHeight: number) {
		super(`${transaction} expired at height ${expirationHeight}`, "ERR_EXPIRED");
		this.expirationHeight = expirationHeight;
	}
}

export class TransactionFeeToLowError extends PoolError {
	public constructor(transaction: ITransaction) {
		super(`${transaction} fee is to low to enter the pool`, "ERR_LOW_FEE");
	}
}

export class TransactionFeeToHighError extends PoolError {
	public constructor(transaction: ITransaction) {
		super(`${transaction} fee is to high to enter the pool`, "ERR_HIGH_FEE");
	}
}

export class SenderExceededMaximumTransactionCountError extends PoolError {
	public readonly maxCount: number;

	public constructor(transaction: ITransaction, maxCount: number) {
		super(
			`${transaction} exceeds sender's ${pluralize("transaction", maxCount)} count limit`,
			"ERR_EXCEEDS_MAX_COUNT",
		);
		this.maxCount = maxCount;
	}
}

export class TransactionPoolFullError extends PoolError {
	public readonly required: any; // @TODO: BigNumber

	public constructor(transaction: ITransaction, required: any) {
		const formatSatoshi = (value) => value.toString();

		const message =
			`${transaction} fee ${formatSatoshi(transaction.data.fee)} ` +
			`is lower than ${formatSatoshi(required)} already in pool`;
		super(message, "ERR_POOL_FULL");
		this.required = required;
	}
}

export class TransactionFailedToApplyError extends PoolError {
	public readonly error: Error;

	public constructor(transaction: ITransaction, error: Error) {
		super(`${transaction} cannot be applied: ${error.message}`, "ERR_APPLY");
		this.error = error;
	}
}

export class TransactionFailedToVerifyError extends PoolError {
	public constructor(transaction: ITransaction) {
		super(`${transaction} didn't passed verification`, "ERR_BAD_DATA");
	}
}

export class TransactionFromFutureError extends PoolError {
	public secondsInFuture: number;

	public constructor(transaction: ITransaction, secondsInFuture: number) {
		super(`${transaction} is ${pluralize("second", secondsInFuture)} in future`, "ERR_FROM_FUTURE");
		this.secondsInFuture = secondsInFuture;
	}
}

export class TransactionFromWrongNetworkError extends PoolError {
	public currentNetwork: number;

	public constructor(transaction: ITransaction, currentNetwork: number) {
		super(
			`${transaction} network ${transaction.data.network} doesn't match node's network ${currentNetwork}`,
			"ERR_WRONG_NETWORK",
		);
		this.currentNetwork = currentNetwork;
	}
}

export class InvalidTransactionDataError extends PoolError {
	public constructor(reason: string) {
		super(`Invalid transaction data: ${reason}`, "ERR_BAD_DATA");
	}
}

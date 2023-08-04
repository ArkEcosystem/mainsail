import { BigNumber } from "@mainsail/utils";
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
		super(`tx ${transaction.id} cannot be added to pool, please retry`, "ERR_RETRY");
	}
}

export class TransactionAlreadyInPoolError extends PoolError {
	public constructor(transaction: ITransaction) {
		super(`tx ${transaction.id} is already in pool`, "ERR_DUPLICATE");
	}
}

export class TransactionExceedsMaximumByteSizeError extends PoolError {
	public readonly maxSize: number;

	public constructor(transaction: ITransaction, maxSize: number) {
		super(
			`tx ${transaction.id} exceeds size limit of ${pluralize("byte", maxSize)}`,
			"ERR_TOO_LARGE", // ! should be "ERR_TO_LARGE" instead of "ERR_TOO_LARGE"
		);
		this.maxSize = maxSize;
	}
}

export class TransactionHasExpiredError extends PoolError {
	public readonly expirationHeight: number;

	public constructor(transaction: ITransaction, expirationHeight: number) {
		super(`tx ${transaction.id} expired at height ${expirationHeight}`, "ERR_EXPIRED");
		this.expirationHeight = expirationHeight;
	}
}

export class TransactionFeeToLowError extends PoolError {
	public constructor(transaction: ITransaction) {
		super(`tx ${transaction.id} fee is to low to enter the pool`, "ERR_LOW_FEE");
	}
}

export class TransactionFeeToHighError extends PoolError {
	public constructor(transaction: ITransaction) {
		super(`tx ${transaction.id} fee is to high to enter the pool`, "ERR_HIGH_FEE");
	}
}

export class SenderExceededMaximumTransactionCountError extends PoolError {
	public readonly maxCount: number;

	public constructor(transaction: ITransaction, maxCount: number) {
		super(
			`tx ${transaction.id} exceeds sender's ${pluralize("transaction", maxCount)} count limit`,
			"ERR_EXCEEDS_MAX_COUNT",
		);
		this.maxCount = maxCount;
	}
}

export class TransactionPoolFullError extends PoolError {
	public readonly required: BigNumber;

	public constructor(transaction: ITransaction, required: BigNumber) {
		super(
			`tx ${
				transaction.id
			} fee ${transaction.data.fee.toString()} is lower than ${required.toString()} already in pool`,
			"ERR_POOL_FULL",
		);
		this.required = required;
	}
}

export class TransactionFailedToApplyError extends PoolError {
	public readonly error: Error;

	public constructor(transaction: ITransaction, error: Error) {
		super(`tx ${transaction.id} cannot be applied: ${error.message}`, "ERR_APPLY");
		this.error = error;
	}
}

export class TransactionFailedToVerifyError extends PoolError {
	public constructor(transaction: ITransaction) {
		super(`tx ${transaction.id} didn't passed verification`, "ERR_BAD_DATA");
	}
}

export class TransactionFromWrongNetworkError extends PoolError {
	public currentNetwork: number;

	public constructor(transaction: ITransaction, currentNetwork: number) {
		super(
			`tx ${transaction.id} network ${transaction.data.network} doesn't match node's network ${currentNetwork}`,
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

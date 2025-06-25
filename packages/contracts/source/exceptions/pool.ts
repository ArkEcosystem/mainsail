import { Transaction } from "../contracts/crypto/transactions.js";
import { Exception } from "./base.js";

export class PoolError extends Exception {
	public readonly type: string;

	public constructor(message: string, type: string) {
		super(message);
		this.type = type;
	}
}

export class TransactionAlreadyInPoolError extends PoolError {
	public constructor(transaction: Transaction) {
		super(`tx ${transaction.hash} is already in pool`, "ERR_DUPLICATE");
	}
}

export class TransactionExceedsMaximumByteSizeError extends PoolError {
	public readonly maxSize: number;

	public constructor(transaction: Transaction, maxSize: number) {
		super(
			`tx ${transaction.hash} exceeds size limit of ${maxSize} byte(s)`,
			"ERR_TOO_LARGE", // ! should be "ERR_TO_LARGE" instead of "ERR_TOO_LARGE"
		);
		this.maxSize = maxSize;
	}
}

export class TransactionFeeTooLowError extends PoolError {
	public constructor(transaction: Transaction) {
		super(`tx ${transaction.hash} fee is too low to enter the pool`, "ERR_LOW_FEE");
	}
}

export class TransactionFeeTooHighError extends PoolError {
	public constructor(transaction: Transaction) {
		super(`tx ${transaction.hash} fee is too high to enter the pool`, "ERR_HIGH_FEE");
	}
}

export class SenderExceededMaximumTransactionCountError extends PoolError {
	public readonly maxCount: number;

	public constructor(transaction: Transaction, maxCount: number) {
		super(
			`tx ${transaction.hash} exceeds sender's transaction count limit of ${maxCount}`,
			"ERR_EXCEEDS_MAX_COUNT",
		);
		this.maxCount = maxCount;
	}
}

export class TransactionPoolFullError extends PoolError {
	public readonly required: number;

	public constructor(transaction: Transaction, required: number) {
		super(
			`tx ${transaction.hash} fee ${transaction.data.gasPrice} is lower than ${required} already in pool`,
			"ERR_POOL_FULL",
		);
		this.required = required;
	}
}

export class TransactionFailedToPreverifyError extends PoolError {
	public readonly error: Error;

	public constructor(transaction: Transaction, error: Error) {
		super(`tx ${transaction.hash} cannot be preverified: ${error.message}`, "ERR_PREVERIFY");
		this.error = error;
	}
}

export class TransactionFailedToApplyError extends PoolError {
	public readonly error: Error;

	public constructor(transaction: Transaction, error: Error) {
		super(`tx ${transaction.hash} cannot be applied: ${error.message}`, "ERR_APPLY");
		this.error = error;
	}
}

export class TransactionFailedToVerifyError extends PoolError {
	public constructor(transaction: Transaction) {
		super(`tx ${transaction.hash} didn't pass verification`, "ERR_BAD_DATA");
	}
}

export class TransactionFromWrongNetworkError extends PoolError {
	public currentNetwork: number;

	public constructor(transaction: Transaction, currentNetwork: number) {
		super(
			`tx ${transaction.hash} network ${transaction.data.network} doesn't match node's network ${currentNetwork}`,
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

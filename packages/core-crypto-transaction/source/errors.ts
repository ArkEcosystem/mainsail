export class CryptoError extends Error {
	public constructor(message: string) {
		super(message);

		Object.defineProperty(this, "message", {
			enumerable: false,
			value: message,
		});

		Object.defineProperty(this, "name", {
			enumerable: false,
			value: this.constructor.name,
		});

		Error.captureStackTrace(this, this.constructor);
	}
}

export class NotImplemented extends CryptoError {
	public constructor() {
		super(`Feature is not available.`);
	}
}

export class InvalidTransactionBytesError extends CryptoError {
	public constructor(message: string) {
		super(`Failed to deserialize transaction, encountered invalid bytes: ${message}`);
	}
}

export class TransactionSchemaError extends CryptoError {
	public constructor(what: string) {
		super(what);
	}
}

export class TransactionVersionError extends CryptoError {
	public constructor(given: number) {
		super(`Version ${given} not supported.`);
	}
}

export class UnkownTransactionError extends CryptoError {
	public constructor(given: string) {
		super(`Unknown transaction type: ${given}`);
	}
}

export class TransactionAlreadyRegisteredError extends CryptoError {
	public constructor(name: string) {
		super(`Transaction type ${name} is already registered.`);
	}
}

export class TransactionKeyAlreadyRegisteredError extends CryptoError {
	public constructor(name: string) {
		super(`Transaction key ${name} is already registered.`);
	}
}

export class TransactionVersionAlreadyRegisteredError extends CryptoError {
	public constructor(name: string, version: number) {
		super(`Transaction type ${name} is already registered in version ${version}.`);
	}
}

export class MaximumPaymentCountExceededError extends CryptoError {
	public constructor(limit: number) {
		super(`Number of payments exceeded the allowed maximum of ${limit}.`);
	}
}

export class MinimumPaymentCountSubceededError extends CryptoError {
	public constructor() {
		super(`Number of payments subceeded the required minimum of 2.`);
	}
}

export class VendorFieldLengthExceededError extends CryptoError {
	public constructor(limit: number) {
		super(`Length of vendor field exceeded the allowed maximum ${limit}.`);
	}
}

export class MissingTransactionSignatureError extends CryptoError {
	public constructor() {
		super(`Expected the transaction to be signed.`);
	}
}

export class InvalidMultiSignatureAssetError extends CryptoError {
	public constructor() {
		super(`The multi signature asset is invalid.`);
	}
}

export class DuplicateParticipantInMultiSignatureError extends CryptoError {
	public constructor() {
		super(`Invalid multi signature, because duplicate participant found.`);
	}
}

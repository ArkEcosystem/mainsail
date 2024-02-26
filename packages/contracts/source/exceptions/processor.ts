import { Exception } from "./base";

export class ValidatorException extends Exception {}

export class BlockNotChained extends ValidatorException {
	public constructor() {
		super(`Block is not chained.`);
	}
}

export class BlockNotVerified extends ValidatorException {
	public constructor() {
		super(`Block is not verified.`);
	}
}

export class InvalidTimestamp extends ValidatorException {
	public constructor() {
		super(`Block timestamp is too low.`);
	}
}

export class InvalidGenerator extends ValidatorException {
	public constructor() {
		super(`Block has invalid generator.`);
	}
}

export class IncompatibleTransactions extends ValidatorException {
	public constructor() {
		super(`Block contains incompatible transaction.`);
	}
}

export class InvalidNonce extends ValidatorException {
	public constructor() {
		super(`Block contains invalid nonce for sender.`);
	}
}

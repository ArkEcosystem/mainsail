import { Exception } from "./base";

export class RuntimeException extends Exception {}

export class OverflowException extends RuntimeException {}

export class RangeException extends RuntimeException {}

export class UnderflowException extends RuntimeException {}

export class UnexpectedValueException extends RuntimeException {}

export class NotImplemented extends RuntimeException {
	public constructor(klass: string, method: string) {
		super(`Method [${method}] is not implemented in [${klass}].`);
	}
}

export class AssertionException extends RuntimeException {}

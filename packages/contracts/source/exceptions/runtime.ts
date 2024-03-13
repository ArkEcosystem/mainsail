import { Exception } from "./base.js";

export class RuntimeException extends Exception {}

export class NotImplemented extends RuntimeException {
	public constructor(method: string, klass: string) {
		super(`Method [${method}] is not implemented in [${klass}].`);
	}
}

export class AssertionException extends RuntimeException {}

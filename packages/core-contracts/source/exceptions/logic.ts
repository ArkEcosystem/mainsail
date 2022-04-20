import { Exception } from "./base";

export class LogicException extends Exception {}

export class BadMethodCallException extends LogicException {}

export class DomainException extends LogicException {}

export class InvalidArgumentException extends LogicException {}

export class LengthException extends LogicException {}

export class OutOfBoundsException extends LogicException {}

export class OutOfRangeException extends LogicException {}

export class MethodNotImplemented extends BadMethodCallException {
	public constructor(methodName: string) {
		super(`The ${methodName}() is not implemented.`);
	}
}

export class MethodArgumentNotImplemented extends BadMethodCallException {
	public constructor(methodName: string, argumentName: string) {
		super(`The ${methodName}() method's argument [${argumentName}] behavior is not implemented.`);
	}
}

export class MethodArgumentValueNotImplemented extends BadMethodCallException {
	public constructor(methodName: string, argumentName: string, argumentValue) {
		super(
			`The ${methodName}() method's argument $${argumentName} value ${argumentValue} behavior is not implemented.`,
		);
	}
}

export class UnexpectedType extends InvalidArgumentException {
	public constructor(parameterName: string, expectedType: string, givenType: any) {
		super(`Expected argument [${parameterName}] of type ${expectedType}, ${givenType} given`);
	}
}

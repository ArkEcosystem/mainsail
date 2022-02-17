import { Exception } from "./base";

export class ContainerException extends Exception {}

export class EntryNotFound extends ContainerException {}

export class BindingResolution extends ContainerException {}

export class ParameterNotFound extends ContainerException {}

export class ServiceNotFound extends ContainerException {}

export class InvalidBindingName extends ContainerException {
	public constructor(name: string) {
		super(`The name [${name}] is reserved.`);
	}
}

export class DriverCannotBeResolved extends ContainerException {
	public constructor(name: string) {
		super(`Unable to resolve driver for [${name}].'`);
	}
}

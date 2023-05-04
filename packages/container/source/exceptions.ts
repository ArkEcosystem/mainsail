export class ContainerException extends Error {
	public constructor(message: string, code?: string) {
		super(message);

		Object.defineProperty(this, "message", {
			enumerable: false,
			value: code ? `${code}: ${message}` : message,
		});

		Object.defineProperty(this, "name", {
			enumerable: false,
			value: this.constructor.name,
		});

		Error.captureStackTrace(this, this.constructor);
	}
}

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

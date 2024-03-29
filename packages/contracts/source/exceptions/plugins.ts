import { InvalidArgumentException, OutOfRangeException } from "./logic.js";
import { RuntimeException } from "./runtime.js";

export class InvalidPluginConfiguration extends InvalidArgumentException {
	public constructor(name: string, errors: Record<string, string[]>) {
		super(`[${name}] Failed to validate the configuration: "${JSON.stringify(errors, undefined, 4)}".`);
	}
}

export class ServiceProviderCannotBeRegistered extends RuntimeException {
	public constructor(name: string, error: string) {
		super(`[${name}] Failed to register: "${error}".`);
	}
}

export class ServiceProviderCannotBeBooted extends RuntimeException {
	public constructor(name: string, error: string) {
		super(`[${name}] Failed to boot: "${error}".`);
	}
}

export class DependencyVersionOutOfRange extends OutOfRangeException {
	public constructor(dep: string, expected: string, given: string) {
		super(`Expected "${dep}" to satisfy "${expected}" but received "${given}".`);
	}
}

export class OptionalDependencyCannotBeFound extends RuntimeException {
	public constructor(serviceProvider: string, dependency: string) {
		super(
			`The "${dependency}" package is missing. Please, make sure to install this library to take advantage of ${serviceProvider}.`,
		);
	}
}

export class RequiredDependencyCannotBeFound extends RuntimeException {
	public constructor(serviceProvider: string, dependency: string) {
		super(
			`The "${dependency}" package is required but missing. Please, make sure to install this library to take advantage of ${serviceProvider}.`,
		);
	}
}

export class InvalidVersion extends InvalidArgumentException {
	public constructor(version: string) {
		super(
			`"${version}" is not a valid semantic version. Please check https://semver.org/ and make sure you follow the spec.`,
		);
	}
}

export class UnsupportedVersionConstraint extends RuntimeException {
	public constructor(version: string) {
		super(
			`"${version}" is not a valid semantic version. Please check https://semver.org/ and make sure you follow the spec.`,
		);
	}
}

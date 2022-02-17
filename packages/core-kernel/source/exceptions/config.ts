import { InvalidArgumentException } from "./logic";

export class ConfigurationException extends InvalidArgumentException {}

export class InvalidConfiguration extends ConfigurationException {}

export class EnvNotFound extends ConfigurationException {}

export class EnvParameter extends ConfigurationException {}

export class ApplicationConfigurationCannotBeLoaded extends ConfigurationException {
	public constructor(message: string) {
		super(`Unable to load the application configuration file. ${message}`);
	}
}

export class EnvironmentConfigurationCannotBeLoaded extends ConfigurationException {
	public constructor(message: string) {
		super(`Unable to load the environment file. ${message}`);
	}
}

export class NetworkCannotBeDetermined extends ConfigurationException {
	public constructor() {
		super("Unable to discover application token or network.");
	}
}

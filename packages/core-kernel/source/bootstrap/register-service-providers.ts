import { inject, injectable } from "@arkecosystem/core-container";
import { Identifiers, Contracts, Exceptions } from "@arkecosystem/core-contracts";
import semver from "semver";

import { PluginConfiguration, ServiceProvider, ServiceProviderRepository } from "../providers";
import { ValidationManager } from "../services/validation";
import { assert } from "../utils";
import { Bootstrapper } from "./interfaces";

// @TODO review the implementation

@injectable()
export class RegisterServiceProviders implements Bootstrapper {
	@inject(Identifiers.Application)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async bootstrap(): Promise<void> {
		const serviceProviders: ServiceProviderRepository = this.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
		);

		for (const [name, serviceProvider] of serviceProviders.all()) {
			const serviceProviderName: string | undefined = serviceProvider.name();

			assert.defined<string>(serviceProviderName);

			try {
				// Does the configuration conform to the given rules?
				await this.#validateConfiguration(serviceProvider);

				// Are all dependencies installed with the correct versions?
				if (await this.#satisfiesDependencies(serviceProvider)) {
					await serviceProviders.register(name);
				}
			} catch (error) {
				console.error(error.stack);

				// Determine if the plugin is required to decide how to handle errors.
				const isRequired: boolean = await serviceProvider.required();

				if (isRequired) {
					throw new Exceptions.ServiceProviderCannotBeRegistered(serviceProviderName, error.message);
				}

				serviceProviders.fail(serviceProviderName);
			}
		}
	}

	async #validateConfiguration(serviceProvider: ServiceProvider): Promise<void> {
		const configSchema: object = serviceProvider.configSchema();

		if (Object.keys(configSchema).length > 0) {
			const config: PluginConfiguration = serviceProvider.config();

			const validator: Contracts.Kernel.Validator | undefined = this.app
				.get<ValidationManager>(Identifiers.ValidationManager)
				.driver();

			assert.defined<Contracts.Kernel.Validator>(validator);

			validator.validate(config.all(), configSchema);

			if (validator.fails()) {
				const serviceProviderName: string | undefined = serviceProvider.name();

				assert.defined<string>(serviceProviderName);

				throw new Exceptions.InvalidPluginConfiguration(serviceProviderName, validator.errors());
			}

			serviceProvider.setConfig(config.merge(validator.valid() || {}));
		}
	}

	async #satisfiesDependencies(serviceProvider: ServiceProvider): Promise<boolean> {
		const serviceProviders: ServiceProviderRepository = this.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProviderRepository,
		);

		for (const dependency of serviceProvider.dependencies()) {
			const { name, version: constraint, required } = dependency;

			const isRequired: boolean = typeof required === "function" ? await required() : !!required;

			const serviceProviderName: string | undefined = serviceProvider.name();

			assert.defined<string>(serviceProviderName);

			if (!serviceProviders.has(name)) {
				// The dependency is necessary for this package to function. We'll output an error and terminate the process.
				if (isRequired) {
					const error = new Exceptions.RequiredDependencyCannotBeFound(serviceProviderName, name);

					await this.app.terminate(error.message, error);
				}

				// The dependency is optional for this package to function. We'll only output a warning.
				const error = new Exceptions.OptionalDependencyCannotBeFound(serviceProviderName, name);

				this.logger.warning(error.message);

				serviceProviders.fail(serviceProviderName);

				return false;
			}

			if (constraint) {
				const version: string | undefined = serviceProviders.get(name).version();

				assert.defined<string>(version);

				if (!semver.satisfies(version, constraint)) {
					const error = new Exceptions.DependencyVersionOutOfRange(name, constraint, version);

					if (isRequired) {
						await this.app.terminate(error.message, error);
					}

					this.logger.warning(error.message);

					serviceProviders.fail(serviceProviderName);
				}
			}
		}

		return true;
	}
}

import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import {
	DependencyVersionOutOfRange,
	InvalidPluginConfiguration,
	DependencyCannotBeFound,
	ServiceProviderCannotBeRegistered,
} from "@mainsail/exceptions";
import { assert, ensureError } from "@mainsail/utils";
import semver from "semver";

import { ServiceProvider, ServiceProviderRepository } from "../providers/index.js";
import { ValidationManager } from "../services/validation/index.js";

// @TODO review the implementation

@injectable()
export class RegisterServiceProviders implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async bootstrap(): Promise<void> {
		const serviceProviders: ServiceProviderRepository = this.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);

		for (const serviceProvider of serviceProviders.all()) {
			const name = serviceProvider.name();

			try {
				// Does the configuration conform to the given rules?
				await this.#validateConfiguration(serviceProvider);

				// Are all dependencies installed with the correct versions?
				await this.#satisfiesDependencies(serviceProvider);

				await serviceProviders.register(name);
			} catch (rawError) {
				const error = ensureError(rawError);
				this.logger.error(`${name}: ${error.stack}`);

				throw new ServiceProviderCannotBeRegistered(name, error.message);
			}
		}
	}

	async #validateConfiguration(serviceProvider: ServiceProvider): Promise<void> {
		const configSchema: object = serviceProvider.configSchema();

		if (Object.keys(configSchema).length > 0) {
			const config = serviceProvider.config();

			const validator = this.app.get<ValidationManager>(Identifiers.Services.Validation.Manager).driver();

			validator.validate(config.all(), configSchema);

			if (validator.fails()) {
				const serviceProviderName: string | undefined = serviceProvider.name();

				assert.string(serviceProviderName);

				throw new InvalidPluginConfiguration(serviceProviderName, validator.errors());
			}

			serviceProvider.setConfig(config.merge(validator.valid() || {}));
		}
	}

	async #satisfiesDependencies(serviceProvider: ServiceProvider): Promise<void> {
		const serviceProviders: ServiceProviderRepository = this.app.get<ServiceProviderRepository>(
			Identifiers.ServiceProvider.Repository,
		);

		const serviceProviderName = serviceProvider.name();

		for (const dependency of serviceProvider.dependencies()) {
			const { name, version: constraint } = dependency;

			if (!serviceProviders.has(name)) {
				const error = new DependencyCannotBeFound(serviceProviderName, name);

				await this.app.terminate(error.message, error);
			}

			if (constraint) {
				const version: string | undefined = serviceProviders.get(name).version();

				assert.string(version);

				if (!semver.satisfies(version, constraint)) {
					const error = new DependencyVersionOutOfRange(name, constraint, version);

					await this.app.terminate(error.message, error);
				}
			}
		}
	}
}

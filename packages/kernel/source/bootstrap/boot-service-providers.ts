import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

import { BlockEvent, KernelEvent } from "../enums/events.js";
import { ServiceProviderRepository } from "../providers/index.js";
import { assert } from "../utils/assert.js";
import { Bootstrapper } from "./interfaces.js";
import { ChangeServiceProviderState } from "./listeners.js";

// @TODO review the implementation

@injectable()
export class BootServiceProviders implements Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Repository)
	private readonly serviceProviders!: ServiceProviderRepository;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async bootstrap(): Promise<void> {
		for (const [name, serviceProvider] of this.serviceProviders.all()) {
			const serviceProviderName: string | undefined = serviceProvider.name();

			assert.defined<string>(serviceProviderName);

			if (await serviceProvider.bootWhen()) {
				try {
					await this.serviceProviders.boot(name);
				} catch (error) {
					this.logger.error(error.stack);
					const isRequired: boolean = await serviceProvider.required();

					if (isRequired) {
						throw new Exceptions.ServiceProviderCannotBeBooted(serviceProviderName, error.message);
					}

					this.serviceProviders.fail(serviceProviderName);
				}
			} else {
				this.serviceProviders.defer(name);
			}

			const eventListener: Contracts.Kernel.EventListener = this.app
				.resolve(ChangeServiceProviderState)
				.initialize(serviceProviderName, serviceProvider);

			// Register the "enable/disposeWhen" listeners to be triggered on every block. Use with care!
			this.events.listen(BlockEvent.Applied, eventListener);

			// We only want to trigger this if another service provider has been booted to avoid an infinite loop.
			this.events.listen(KernelEvent.ServiceProviderBooted, eventListener);
		}
	}
}

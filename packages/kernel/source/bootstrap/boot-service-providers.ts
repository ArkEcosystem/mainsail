import type { Contracts } from "@mainsail/contracts";

import { Events, Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ServiceProviderCannotBeBooted } from "@mainsail/exceptions";
import { ensureError } from "@mainsail/utils";

import { ServiceProviderRepository } from "../providers/index.js";
import { ChangeServiceProviderState } from "./listeners.js";

@injectable()
export class BootServiceProviders implements Contracts.Kernel.Bootstrapper {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ServiceProvider.Repository)
	private readonly serviceProviders!: ServiceProviderRepository;

	@inject(Identifiers.Services.EventDispatcher.Service)
	private readonly events!: Contracts.Kernel.EventDispatcher;

	@inject(Identifiers.Services.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async bootstrap(): Promise<void> {
		for (const serviceProvider of this.serviceProviders.all()) {
			const name = serviceProvider.name();

			if (await serviceProvider.bootWhen()) {
				try {
					await this.serviceProviders.boot(name);
				} catch (rawError) {
					const error = ensureError(rawError);
					this.logger.error(`${name}: ${error.stack}`);

					throw new ServiceProviderCannotBeBooted(name, error.message);
				}
			} else {
				this.serviceProviders.defer(name);
			}

			const eventListener: Contracts.Kernel.EventListener = this.app
				.resolve(ChangeServiceProviderState)
				.initialize(name, serviceProvider);

			this.events.listen(Events.BlockEvent.Applied, eventListener);
			this.events.listen(Events.KernelEvent.ServiceProviderBooted, eventListener);
		}
	}
}
